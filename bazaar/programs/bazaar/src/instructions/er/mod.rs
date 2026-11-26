//! Ephemeral Rollup flow. Setup (claim plot, open shop) happens on the base layer. `delegate_shop` then hands the
//! Business and a ShopLedger to the ER validator, where price changes, restocking, upgrades, auctions and customer
//! payments run at ER speed. `undelegate_shop` commits and returns them to the base
//! layer, and `settle_shop` turns the ledger's net GD into real token movement.
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use ephemeral_rollups_sdk::anchor::{action, commit, delegate};
use ephemeral_rollups_sdk::ephem::{CallHandler, FoldableIntentBuilder, MagicIntentBundleBuilder};
use ephemeral_rollups_sdk::{ActionArgs, ShortAccountMeta};
use ephemeral_rollups_sdk::pda::ephemeral_balance_pda_from_payer;
use ephemeral_rollups_sdk::vrf::{
    self,
    anchor::VrfProgram,
    consts::{program_identity_pda, scoped_vrf_identity_const},
    instructions::{create_request_randomness_ix_const, RequestRandomnessParams},
    types::SerializableAccountMeta,
};
use anchor_lang::solana_program::{instruction::{AccountMeta, Instruction}, program::{invoke, invoke_signed}};
use magicblock_magic_program_api::{args::ScheduleTaskArgs, instruction::MagicBlockInstruction};
use ephemeral_rollups_sdk::consts::MAGIC_PROGRAM_ID;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};
use crate::constants::*;
use crate::errors::BazaarError;
use crate::gd;
use crate::state::*;

// ───────────── base layer ─────────────

#[derive(Accounts, Session)]
pub struct InitLedger<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(
        init,
        payer = signer,
        space = 8 + ShopLedger::INIT_SPACE,
        seeds = [b"ledger", business.key().as_ref()],
        bump
    )]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_init_ledger(ctx: Context<InitLedger>) -> Result<()> {
    let l = &mut ctx.accounts.ledger;
    l.business = ctx.accounts.business.key();
    l.owner = ctx.accounts.business.owner;
    l.season = ctx.accounts.season.key();
    l.gd_snapshot = 0; // filled by delegate_shop, which escrows the balance
    l.gd_credit = 0;
    l.customers_served = 0;
    l.last_auction_id = 0;
    Ok(())
}

#[delegate]
#[derive(Accounts, Session)]
pub struct DelegateShop<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut, del, seeds = [b"business", business.plot.as_ref()], bump)]
    pub business: Account<'info, Business>,
    #[account(mut, del, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = payer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Escrows the player's GD in the treasury (so it cannot also be spent on the base layer), records it in the
/// ledger, and hands the shop to the Ephemeral Rollup validator `validator`, asking for a commit every 30 seconds (not observed: the client calls commit_shop instead).
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.payer.key(), BazaarError::Unauthorized)]
pub fn handle_delegate_shop(ctx: Context<DelegateShop>, validator: Option<Pubkey>) -> Result<()> {
    require!(ctx.accounts.business.season_id == ctx.accounts.season.id, BazaarError::InvalidPlot);
    let amount = ctx.accounts.player_gd.amount;
    if amount > 0 {
        gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.player_gd, &ctx.accounts.treasury, amount)?;
        ctx.accounts.ledger.gd_snapshot = ctx.accounts.ledger.gd_snapshot.checked_add(amount).ok_or(BazaarError::InvalidAmount)?;
    }
    ctx.accounts.ledger.exit(&crate::ID)?; // write the ledger while this program still owns it
    let plot = ctx.accounts.business.plot;
    let business_key = ctx.accounts.business.key();
    ctx.accounts.delegate_business(
        &ctx.accounts.payer,
        &[b"business", plot.as_ref()],
        DelegateConfig { commit_frequency_ms: 30_000, validator },
    )?;
    ctx.accounts.delegate_ledger(
        &ctx.accounts.payer,
        &[b"ledger", business_key.as_ref()],
        DelegateConfig { commit_frequency_ms: 30_000, validator },
    )?;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct SettleShop<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// After undelegation: returns the escrowed GD plus the session's net earnings to the player's token account.
/// Every rollup spend is checked against `snapshot + credit`, so this amount is never negative.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_settle_shop(ctx: Context<SettleShop>) -> Result<()> {
    let a = ctx.accounts;
    pay_out(&a.token_program, &a.season, &mut a.ledger, &a.treasury, &a.player_gd)
}

/// Pays the escrow plus the session's net GD to the shop owner's token account and clears the ledger.
fn pay_out<'info>(
    token_program: &Program<'info, Token>,
    season: &Account<'info, Season>,
    ledger: &mut Account<'info, ShopLedger>,
    treasury: &Account<'info, TokenAccount>,
    player_gd: &Account<'info, TokenAccount>,
) -> Result<()> {
    ledger.cancel_pending_auction(); // its callback can no longer reach this shop
    let due = available(ledger);
    require!(due >= 0, BazaarError::InsufficientFunds);
    if due > 0 {
        gd::transfer(token_program, season, treasury, player_gd, due as u64)?;
    }
    ledger.gd_credit = 0;
    ledger.gd_snapshot = 0;
    Ok(())
}

// ───────────── Magic Action: settle on the base layer as part of leaving the rollup ─────────────

/// Run by the delegation program after the shop is back on the base layer (scheduled by `undelegate_and_settle`).
/// Only it can sign for `escrow`. The payout can only reach the owner of the shop's ledger.
#[action]
#[derive(Accounts)]
pub struct SettleShopAction<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    // the delegation program appends the next three accounts, in this order
    /// CHECK: the program that scheduled the action: only this one may
    #[account(address = crate::ID @ BazaarError::Unauthorized)]
    pub source_program: UncheckedAccount<'info>,
    /// CHECK: the payer the action was scheduled with
    pub escrow_auth: UncheckedAccount<'info>,
    /// CHECK: signer proves the call came through the delegation program's post-commit path
    #[account(signer, address = ephemeral_balance_pda_from_payer(&escrow_auth.key(), ACTION_ESCROW_INDEX) @ BazaarError::Unauthorized)]
    pub escrow: UncheckedAccount<'info>,
}
const ACTION_ESCROW_INDEX: u8 = 255; // ActionArgs::new default

pub fn handle_settle_shop_action(ctx: Context<SettleShopAction>) -> Result<()> {
    let a = ctx.accounts;
    pay_out(&a.token_program, &a.season, &mut a.ledger, &a.treasury, &a.player_gd)
}

#[commit]
#[derive(Accounts, Session)]
pub struct UndelegateAndSettle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    /// CHECK: base-layer token account, only named for the action
    #[account(seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: UncheckedAccount<'info>,
    /// CHECK: base-layer token account, only named for the action
    #[account(seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: this program, destination of the action
    #[account(address = crate::ID)]
    pub program_id: UncheckedAccount<'info>,
    #[session(signer = payer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Leave the rollup and settle in one step: commit + undelegate, then a Magic Action pays out on the base layer.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.payer.key(), BazaarError::Unauthorized)]
pub fn handle_undelegate_and_settle(ctx: Context<UndelegateAndSettle>) -> Result<()> {
    let a = &ctx.accounts;
    let meta = |key: Pubkey, is_writable: bool| ShortAccountMeta { pubkey: key.to_bytes().into(), is_writable };
    let settle = CallHandler {
        destination_program: crate::ID,
        accounts: vec![
            meta(a.season.key(), false),
            meta(a.business.key(), false),
            meta(a.ledger.key(), true),
            meta(a.player_gd.key(), true),
            meta(a.treasury.key(), true),
            meta(a.token_program.key(), false),
        ],
        args: ActionArgs::new(anchor_lang::InstructionData::data(&crate::instruction::SettleShopAction {})),
        escrow_authority: a.payer.to_account_info(),
        compute_units: 80_000,
    };
    MagicIntentBundleBuilder::new(a.payer.to_account_info(), a.magic_context.to_account_info(), a.magic_program.to_account_info())
        .commit_and_undelegate(&[a.business.to_account_info(), a.ledger.to_account_info()])
        .add_post_undelegate_actions([settle])
        .build_and_invoke()?;
    Ok(())
}

// ───────────── Ephemeral Rollup ─────────────

#[derive(Accounts, Session)]
pub struct ErShop<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
}

#[derive(Accounts, Session)]
pub struct ErServe<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = signer, authority = season.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
}

fn available(l: &ShopLedger) -> i64 {
    l.gd_snapshot as i64 + l.gd_credit
}
fn storage_cap(b: &Business) -> u32 {
    if b.upgrades & STORAGE_UPGRADE_FLAG != 0 { MAX_INVENTORY * 2 } else { MAX_INVENTORY }
}

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_restock(ctx: Context<ErShop>, units: u32) -> Result<()> {
    require!(units > 0, BazaarError::InvalidAmount);
    let stock = ctx.accounts.business.inventory.checked_add(units).ok_or(BazaarError::InvalidAmount)?;
    let reserved = if ctx.accounts.ledger.auction_pending() { ctx.accounts.ledger.last_units } else { 0 };
    require!(stock.saturating_add(reserved) <= storage_cap(&ctx.accounts.business), BazaarError::InventoryFull);
    let cost = ctx.accounts.business.unit_cost_cents as i64 * units as i64;
    require!(available(&ctx.accounts.ledger) >= cost, BazaarError::InsufficientFunds);
    ctx.accounts.ledger.gd_credit -= cost;
    ctx.accounts.business.inventory = stock;
    Ok(())
}

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_buy_upgrade(ctx: Context<ErShop>, upgrade_flag: u8) -> Result<()> {
    let cost = upgrade_cost_gd(upgrade_flag) as i64 * GD_UNIT as i64;
    require!(cost > 0, BazaarError::InvalidAmount);
    require!((ctx.accounts.business.upgrades & upgrade_flag) == 0, BazaarError::UpgradeAlreadyOwned);
    require!(available(&ctx.accounts.ledger) >= cost, BazaarError::InsufficientFunds);
    ctx.accounts.ledger.gd_credit -= cost;
    ctx.accounts.business.upgrades |= upgrade_flag;
    Ok(())
}

#[session_auth_or(ctx.accounts.season.authority == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_serve_customers(ctx: Context<ErServe>, count: u16) -> Result<()> {
    let n = (count as u32).min(ctx.accounts.business.inventory);
    require!(n > 0, BazaarError::OutOfStock);
    let total = ctx.accounts.business.price_cents as u64 * n as u64;
    let b = &mut ctx.accounts.business;
    b.inventory -= n;
    b.revenue_today = b.revenue_today.saturating_add(total);
    b.total_lifetime_revenue = b.total_lifetime_revenue.saturating_add(total);
    let l = &mut ctx.accounts.ledger;
    l.gd_credit += total as i64;
    l.customers_served = l.customers_served.saturating_add(n as u64);
    Ok(())
}

// ───────────── MagicBlock VRF (requested on the rollup, answered by the oracle in a callback) ─────────────

const PROGRAM_IDENTITY: ([u8; 32], u8) = program_identity_pda(&crate::ID);
/// Only the VRF program can sign for this PDA, and only when answering this program's requests. A `const`, because
/// SDK 0.20.0's `#[vrf_callback]` derives it at runtime and burns the callback's whole compute budget.
const VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);
const SLOT_HASHES: Pubkey = pubkey!("SysvarS1otHashes111111111111111111111111111");
/// An unanswered auction request may be replaced after this long (the oracle queue purges at about 120 s).
const VRF_TIMEOUT_SECS: i64 = 150;

#[cfg(not(feature = "localnet"))]
const VRF_QUEUE: Pubkey = vrf::consts::DEFAULT_EPHEMERAL_QUEUE;
#[cfg(feature = "localnet")]
const VRF_QUEUE: Pubkey = vrf::consts::DEFAULT_TEST_QUEUE; // base-layer test queue: the local VRF program charges fees on the rollup test queue

// The VRF accounts are written out because the SDK's `#[vrf]` macro does not compile on 0.20.0 (slot_hashes path).
#[derive(Accounts, Session)]
pub struct ErVrf<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: this program's identity PDA, signs the request
    #[account(seeds = [b"identity"], bump)]
    pub program_identity: UncheckedAccount<'info>,
    /// CHECK: the rollup's VRF queue
    #[account(mut, address = VRF_QUEUE)]
    pub oracle_queue: UncheckedAccount<'info>,
    pub vrf_program: Program<'info, VrfProgram>,
    /// CHECK: slot hashes sysvar
    #[account(address = SLOT_HASHES)]
    pub slot_hashes: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> ErVrf<'info> {
    fn request(&self, ix: &Instruction) -> Result<()> {
        invoke_signed(
            ix,
            &[
                self.signer.to_account_info(),
                self.program_identity.to_account_info(),
                self.oracle_queue.to_account_info(),
                self.system_program.to_account_info(),
                self.slot_hashes.to_account_info(),
            ],
            &[&[b"identity", &[PROGRAM_IDENTITY.1]]],
        )?;
        Ok(())
    }
}

/// Sealed-bid first-price auction for `units` of wholesale stock. The bid is reserved now; the three rival bids
/// come from VRF randomness that does not exist yet, and `callback_auction` decides the winner.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_bid_auction(ctx: Context<ErVrf>, auction_id: u64, units: u32, bid: u64) -> Result<()> {
    require!(units > 0 && bid > 0, BazaarError::InvalidAmount);
    require!(auction_id > ctx.accounts.ledger.last_auction_id, BazaarError::InvalidAmount); // each auction id once
    let now = Clock::get()?.unix_timestamp;
    if ctx.accounts.ledger.auction_pending() {
        require!(now - ctx.accounts.ledger.last_requested_at >= VRF_TIMEOUT_SECS, BazaarError::AuctionPending);
        ctx.accounts.ledger.cancel_pending_auction();
    }
    let stock = ctx.accounts.business.inventory.checked_add(units).ok_or(BazaarError::InvalidAmount)?;
    require!(stock <= storage_cap(&ctx.accounts.business), BazaarError::InventoryFull);
    require!(bid <= i64::MAX as u64 && available(&ctx.accounts.ledger) >= bid as i64, BazaarError::InsufficientFunds);

    let l = &mut ctx.accounts.ledger;
    l.gd_credit -= bid as i64;
    l.last_auction_id = auction_id;
    l.last_units = units;
    l.last_bid = bid;
    l.last_rivals = [0; 3];
    l.last_won = false;
    l.last_requested_at = now;

    let mut caller_seed = ctx.accounts.business.key().to_bytes();
    caller_seed[..8].copy_from_slice(&auction_id.to_le_bytes());
    let ix = create_request_randomness_ix_const(
        RequestRandomnessParams {
            payer: ctx.accounts.signer.key(),
            oracle_queue: VRF_QUEUE,
            callback_program_id: crate::ID,
            callback_discriminator: crate::instruction::CallbackAuction::DISCRIMINATOR.to_vec(),
            caller_seed,
            accounts_metas: Some(vec![
                SerializableAccountMeta { pubkey: ctx.accounts.business.key(), is_signer: false, is_writable: true },
                SerializableAccountMeta { pubkey: ctx.accounts.ledger.key(), is_signer: false, is_writable: true },
            ]),
            callback_args: Some(auction_id.to_le_bytes().to_vec()),
        },
        Pubkey::new_from_array(PROGRAM_IDENTITY.0),
    );
    ctx.accounts.request(&ix)
}

#[derive(Accounts)]
pub struct CallbackAuction<'info> {
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
}

/// Highest bid wins, ties go to the rivals. A winner keeps the reservation as payment and gets the stock;
/// a loser gets the reserved GD back. Superseded, cancelled and repeated callbacks are rejected.
pub fn handle_callback_auction(ctx: Context<CallbackAuction>, randomness: [u8; 32], auction_id: u64) -> Result<()> {
    let l = &mut ctx.accounts.ledger;
    require!(l.auction_pending() && l.last_auction_id == auction_id, BazaarError::StaleRandomness);
    let b = &mut ctx.accounts.business;
    let rivals = auction_rivals(&randomness, b.unit_cost_cents as u64 * l.last_units as u64);
    let won = l.last_bid > *rivals.iter().max().unwrap();
    if won {
        b.inventory = b.inventory.saturating_add(l.last_units);
    } else {
        l.gd_credit += l.last_bid as i64;
    }
    l.last_rivals = rivals;
    l.last_won = won;
    Ok(())
}

/// Three rival bids, each 60-119% of the lot's wholesale value (at least 1, so "answered" is never all zeros).
pub fn auction_rivals(randomness: &[u8; 32], fair: u64) -> [u64; 3] {
    core::array::from_fn(|i| {
        let r = u64::from_le_bytes(randomness[i * 8..i * 8 + 8].try_into().unwrap());
        (fair.saturating_mul(60 + r % 60) / 100).max(1)
    })
}

/// Number of city event kinds: 1 demand surge, 2 slowdown, 3 viral stall, 4 supply shock, 5 flash-sale craze.
pub const CITY_EVENTS: u8 = 5;

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_request_event(ctx: Context<ErVrf>, client_seed: u64) -> Result<()> {
    let mut caller_seed = ctx.accounts.ledger.key().to_bytes();
    caller_seed[..8].copy_from_slice(&client_seed.to_le_bytes());
    let ix = create_request_randomness_ix_const(
        RequestRandomnessParams {
            payer: ctx.accounts.signer.key(),
            oracle_queue: VRF_QUEUE,
            callback_program_id: crate::ID,
            callback_discriminator: crate::instruction::CallbackCityEvent::DISCRIMINATOR.to_vec(),
            caller_seed,
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.ledger.key(),
                is_signer: false,
                is_writable: false,
            }]),
            callback_args: None,
        },
        Pubkey::new_from_array(PROGRAM_IDENTITY.0),
    );
    ctx.accounts.request(&ix)
}

#[derive(Accounts)]
pub struct CallbackCityEvent<'info> {
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    pub ledger: Account<'info, ShopLedger>,
}

/// Stores nothing: the event is announced in the log (the client subscribes to its ledger's logs). `target`
/// picks the stall for a viral event.
pub fn handle_callback_city_event(_ctx: Context<CallbackCityEvent>, randomness: [u8; 32]) -> Result<()> {
    msg!("CityEvent kind={} target={}", 1 + randomness[0] % CITY_EVENTS, randomness[1]);
    Ok(())
}

// ───────────── Cranks: daily rent, run by the rollup's scheduler ─────────────

#[derive(Accounts)]
pub struct ChargeRent<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
}

/// Charges one day's rent if a day has passed. A scheduled task cannot sign, so this is open to anyone and safe
/// because the clock decides: calling it early or twice does nothing, and missed days are not charged back.
pub fn handle_er_charge_rent(ctx: Context<ChargeRent>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let b = &mut ctx.accounts.business;
    if b.rent_paid_at == 0 {
        b.rent_paid_at = now; // the first day starts now
        return Ok(());
    }
    let amount = SHOP_RENT_GD * GD_UNIT;
    // an unaffordable day stays due and is taken by a later run
    if !rent_is_due(b.rent_paid_at, now) || available(&ctx.accounts.ledger) < amount as i64 {
        return Ok(());
    }
    ctx.accounts.ledger.gd_credit -= amount as i64;
    b.rent_paid_at = now;
    b.rent_paid_total = b.rent_paid_total.saturating_add(amount);
    msg!("RentPaid amount={} total={}", amount, b.rent_paid_total);
    Ok(())
}

fn rent_is_due(paid_at: i64, now: i64) -> bool {
    now.saturating_sub(paid_at) >= RENT_DAY_SECS - RENT_GRACE_SECS
}

#[derive(Accounts, Session)]
pub struct ScheduleRent<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"ledger", business.key().as_ref()], bump)]
    pub ledger: Account<'info, ShopLedger>,
    /// CHECK: the MagicBlock program
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
    #[session(signer = payer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Asks the rollup to run `er_charge_rent` once per day for `days` days. Scheduling again replaces the schedule.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.payer.key(), BazaarError::Unauthorized)]
pub fn handle_schedule_rent(ctx: Context<ScheduleRent>, days: u16) -> Result<()> {
    let a = &ctx.accounts;
    let charge = Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new_readonly(a.season.key(), false),
            AccountMeta::new(a.business.key(), false),
            AccountMeta::new(a.ledger.key(), false),
        ],
        data: anchor_lang::InstructionData::data(&crate::instruction::ErChargeRent {}),
    };
    let task_id = i64::from_le_bytes(a.business.key().to_bytes()[..8].try_into().unwrap()) & i64::MAX;
    // the rollup's scheduler (Hydra on validator 2.x) takes the task and runs it
    let schedule = Instruction::new_with_bincode(
        MAGIC_PROGRAM_ID,
        &MagicBlockInstruction::ScheduleTask(ScheduleTaskArgs {
            task_id,
            execution_interval_millis: RENT_DAY_SECS * 1000,
            iterations: days.clamp(1, MAX_RENT_DAYS) as i64,
            instructions: vec![charge],
        }),
        vec![
            AccountMeta::new(a.payer.key(), true),
            AccountMeta::new_readonly(a.season.key(), false),
            AccountMeta::new(a.business.key(), false),
            AccountMeta::new(a.ledger.key(), false),
        ],
    );
    invoke(
        &schedule,
        &[a.payer.to_account_info(), a.season.to_account_info(), a.business.to_account_info(), a.ledger.to_account_info(), a.magic_program.to_account_info()],
    )?;
    Ok(())
}

#[commit]
#[derive(Accounts, Session)]
pub struct CommitShop<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub business: Account<'info, Business>,
    #[account(mut)]
    pub ledger: Account<'info, ShopLedger>,
    #[session(signer = payer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Push the shop's current ER state to the base layer without leaving the rollup.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.payer.key(), BazaarError::Unauthorized)]
pub fn handle_commit_shop(ctx: Context<CommitShop>) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![&ctx.accounts.business.to_account_info(), &ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.magic_program.to_account_info(),
        None,
    )?;
    Ok(())
}

/// Commit the final ER state and return the shop to the base layer (then call `settle_shop`).
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.payer.key(), BazaarError::Unauthorized)]
pub fn handle_undelegate_shop(ctx: Context<CommitShop>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![&ctx.accounts.business.to_account_info(), &ctx.accounts.ledger.to_account_info()],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.magic_program.to_account_info(),
        None,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rivals_stay_in_range_and_never_zero() {
        for seed in 0u8..=255 {
            let r: [u8; 32] = core::array::from_fn(|i| seed.wrapping_mul(31).wrapping_add(i as u8 * 7));
            assert!(auction_rivals(&r, 10_000).iter().all(|b| (6_000..=11_900).contains(b)));
        }
        assert_eq!(auction_rivals(&[0; 32], 0), [1; 3]);
    }

    #[test]
    fn rent_is_charged_at_most_once_a_day() {
        assert!(!rent_is_due(1_000, 1_000));
        assert!(!rent_is_due(1_000, 1_000 + RENT_DAY_SECS - RENT_GRACE_SECS - 1));
        assert!(rent_is_due(1_000, 1_000 + RENT_DAY_SECS - RENT_GRACE_SECS));
        assert!(!rent_is_due(i64::MAX, 0));
    }

    #[test]
    fn cancelling_returns_the_reserved_bid_once() {
        let mut l = ShopLedger {
            business: Pubkey::default(), owner: Pubkey::default(), season: Pubkey::default(),
            gd_snapshot: 1_000, gd_credit: -400, customers_served: 0, last_auction_id: 1, last_units: 10,
            last_bid: 400, last_rivals: [0; 3], last_won: false, last_requested_at: 0,
        };
        l.cancel_pending_auction();
        l.cancel_pending_auction();
        assert_eq!(l.gd_credit, 0);
        assert!(!l.auction_pending());
    }
}
