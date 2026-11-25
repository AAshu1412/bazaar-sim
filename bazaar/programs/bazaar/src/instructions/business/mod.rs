use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};
use crate::constants::*;
use crate::errors::BazaarError;
use crate::gd;
use crate::state::*;

#[derive(Accounts, Session)]
pub struct OpenBusiness<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(
        init,
        payer = signer,
        space = 8 + Business::INIT_SPACE,
        seeds = [b"business", plot.key().as_ref()],
        bump
    )]
    pub business: Account<'info, Business>,
    #[account(mut, constraint = plot.season_id == season.id @ BazaarError::InvalidPlot)]
    pub plot: Account<'info, Plot>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), authority.key().as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    /// CHECK: the owner's wallet (identity only)
    pub authority: UncheckedAccount<'info>,
    #[session(signer = signer, authority = authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Pays the business's setup cost in GD and opens it with a starter stock of 60 units.
#[session_auth_or(ctx.accounts.authority.key() == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_open_business(
    ctx: Context<OpenBusiness>,
    kind: BusinessKind,
    initial_price_cents: u16,
) -> Result<()> {
    let caller = ctx.accounts.authority.key();
    {
        let plot = &ctx.accounts.plot;
        require!(plot.owner == Some(caller) || plot.lessee == Some(caller), BazaarError::NotPlotOwner);
        require!(plot.business.is_none(), BazaarError::PlotOccupied);
    }
    gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.player_gd, &ctx.accounts.treasury, business_cost_gd(&kind) * GD_UNIT)?;

    let business = &mut ctx.accounts.business;
    business.season_id = ctx.accounts.plot.season_id;
    business.plot = ctx.accounts.plot.key();
    business.owner = caller;
    business.kind = kind;
    business.price_cents = initial_price_cents;
    business.upgrades = 0;
    business.manager = None;
    business.revenue_today = 0;
    business.revenue_trailing_3d = [0, 0, 0];
    business.inventory = 60; // initial starter inventory
    business.unit_cost_cents = initial_price_cents / 2;
    business.total_lifetime_revenue = 0;

    ctx.accounts.plot.business = Some(business.key());
    Ok(())
}

#[derive(Accounts, Session)]
pub struct BuyUpgrade<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_buy_upgrade(ctx: Context<BuyUpgrade>, upgrade_flag: u8) -> Result<()> {
    let cost = upgrade_cost_gd(upgrade_flag);
    require!(cost > 0, BazaarError::InvalidAmount);
    require!((ctx.accounts.business.upgrades & upgrade_flag) == 0, BazaarError::UpgradeAlreadyOwned);
    gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.player_gd, &ctx.accounts.treasury, cost * GD_UNIT)?;
    ctx.accounts.business.upgrades |= upgrade_flag;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct SetBusinessPrice<'info> {
    #[account(mut)]
    pub business: Account<'info, Business>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
}

#[session_auth_or(
    ctx.accounts.business.owner == ctx.accounts.signer.key() || ctx.accounts.business.manager == Some(ctx.accounts.signer.key()),
    BazaarError::Unauthorized
)]
pub fn handle_set_business_price(ctx: Context<SetBusinessPrice>, new_price_cents: u16) -> Result<()> {
    ctx.accounts.business.price_cents = new_price_cents;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct Restock<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    #[session(signer = signer, authority = business.owner.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// Buy `units` of stock at the business's unit cost, paid in GD to the wholesale treasury.
#[session_auth_or(ctx.accounts.business.owner == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_restock(ctx: Context<Restock>, units: u32) -> Result<()> {
    require!(units > 0, BazaarError::InvalidAmount);
    let cap = if ctx.accounts.business.upgrades & STORAGE_UPGRADE_FLAG != 0 { MAX_INVENTORY * 2 } else { MAX_INVENTORY };
    let new_stock = ctx.accounts.business.inventory.checked_add(units).ok_or(BazaarError::InvalidAmount)?;
    require!(new_stock <= cap, BazaarError::InventoryFull);
    let cost = ctx.accounts.business.unit_cost_cents as u64 * units as u64; // raw GD (cents)
    gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.player_gd, &ctx.accounts.treasury, cost)?;
    ctx.accounts.business.inventory = new_stock;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct ServeCustomers<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = business.season_id == season.id @ BazaarError::InvalidPlot)]
    pub business: Account<'info, Business>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub owner_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"player", season.key().as_ref(), business.owner.as_ref()], bump)]
    pub player: Account<'info, PlayerState>,
    #[session(signer = signer, authority = season.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// The town's population buys from a shop: up to `count` customers each pay the shop's price from the
/// treasury to the owner's GD account and take one unit. Only the season authority (the town simulation,
/// i.e. its session key) can run this.
#[session_auth_or(ctx.accounts.season.authority == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_serve_customers(ctx: Context<ServeCustomers>, count: u16) -> Result<()> {
    let n = (count as u32).min(ctx.accounts.business.inventory);
    require!(n > 0, BazaarError::OutOfStock);
    let total = ctx.accounts.business.price_cents as u64 * n as u64; // raw GD (cents)
    gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.treasury, &ctx.accounts.owner_gd, total)?;
    let b = &mut ctx.accounts.business;
    b.inventory -= n;
    b.revenue_today = b.revenue_today.saturating_add(total);
    b.total_lifetime_revenue = b.total_lifetime_revenue.saturating_add(total);
    let p = &mut ctx.accounts.player;
    p.customers_served = p.customers_served.saturating_add(n as u64);
    p.gd_earned = p.gd_earned.saturating_add(total);
    Ok(())
}
