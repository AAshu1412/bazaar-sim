//! Ephemeral Rollup flow. Setup (claim plot, open shop) happens on the base layer. `delegate_shop` then hands the
//! Business and a ShopLedger to the ER validator, where price changes, restocking, upgrades, auctions and customer
//! payments run at ER speed (and auto-commit every 30 s). `undelegate_shop` commits and returns them to the base
//! layer, and `settle_shop` turns the ledger's net GD into real token movement.
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};
use crate::constants::*;
use crate::errors::BazaarError;
use crate::gd;
use crate::instructions::business::auction_rivals;
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
/// ledger, and hands the shop to the Ephemeral Rollup validator `validator`, committing back every 30 seconds.
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
    let due = available(&ctx.accounts.ledger);
    require!(due >= 0, BazaarError::InsufficientFunds);
    if due > 0 {
        gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.treasury, &ctx.accounts.player_gd, due as u64)?;
    }
    let l = &mut ctx.accounts.ledger;
    l.gd_credit = 0;
    l.gd_snapshot = 0;
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
    require!(stock <= storage_cap(&ctx.accounts.business), BazaarError::InventoryFull);
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

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_er_bid_auction(ctx: Context<ErShop>, auction_id: u64, units: u32, bid: u64) -> Result<()> {
    require!(units > 0 && bid > 0, BazaarError::InvalidAmount);
    require!(auction_id > ctx.accounts.ledger.last_auction_id, BazaarError::InvalidAmount); // each auction id once
    let slot = Clock::get()?.slot;
    let fair = ctx.accounts.business.unit_cost_cents as u64 * units as u64;
    let rivals = auction_rivals(&ctx.accounts.season.key(), auction_id, slot, fair);
    let won = bid > *rivals.iter().max().unwrap();
    if won {
        let stock = ctx.accounts.business.inventory.checked_add(units).ok_or(BazaarError::InvalidAmount)?;
        require!(stock <= storage_cap(&ctx.accounts.business), BazaarError::InventoryFull);
        require!(available(&ctx.accounts.ledger) >= bid as i64, BazaarError::InsufficientFunds);
        ctx.accounts.ledger.gd_credit -= bid as i64;
        ctx.accounts.business.inventory = stock;
    }
    let l = &mut ctx.accounts.ledger;
    l.last_auction_id = auction_id;
    l.last_units = units;
    l.last_bid = bid;
    l.last_rivals = rivals;
    l.last_won = won;
    l.last_slot = slot;
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
