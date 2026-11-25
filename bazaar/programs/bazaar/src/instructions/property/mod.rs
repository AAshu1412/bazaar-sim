use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};
use crate::constants::*;
use crate::errors::BazaarError;
use crate::gd;
use crate::state::*;

#[derive(Accounts, Session)]
#[instruction(season_id: u64, plot_id: u16)]
pub struct InitializePlot<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(
        init,
        payer = signer,
        space = 8 + Plot::INIT_SPACE,
        seeds = [b"plot", season.key().as_ref(), plot_id.to_le_bytes().as_ref()],
        bump
    )]
    pub plot: Account<'info, Plot>,
    #[session(signer = signer, authority = season.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[session_auth_or(ctx.accounts.season.authority == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_initialize_plot(
    ctx: Context<InitializePlot>,
    season_id: u64,
    plot_id: u16,
    tier: PlotTier,
    street: u8,
    position: u8,
) -> Result<()> {
    require!((plot_id as usize) < TOTAL_PLOTS, BazaarError::InvalidPlot);
    let plot = &mut ctx.accounts.plot;
    plot.season_id = season_id;
    plot.plot_id = plot_id;
    plot.tier = tier;
    plot.street = street;
    plot.position = position;
    plot.owner = None;
    plot.lessee = None;
    plot.lease_rate = 0;
    plot.last_clearing_price = match tier {
        PlotTier::Corner => 5000,
        PlotTier::MainStreet => 3000,
        PlotTier::SideStreet => 1500,
        PlotTier::Alley => 800,
    }; // whole GD
    plot.business = None;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct ClaimPlot<'info> {
    #[account(seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(mut, constraint = plot.season_id == season.id @ BazaarError::InvalidPlot)]
    pub plot: Account<'info, Plot>,
    #[account(mut, seeds = [b"gd", season.key().as_ref(), authority.key().as_ref()], bump)]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"treasury", season.key().as_ref()], bump)]
    pub treasury: Account<'info, TokenAccount>,
    /// CHECK: the buyer's wallet (identity only)
    pub authority: UncheckedAccount<'info>,
    #[session(signer = signer, authority = authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// First come, first served: pay the plot's price in GD to the town treasury and become its owner.
#[session_auth_or(ctx.accounts.authority.key() == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_claim_plot(ctx: Context<ClaimPlot>) -> Result<()> {
    require!(ctx.accounts.plot.owner.is_none() && ctx.accounts.plot.lessee.is_none(), BazaarError::PlotOccupied);
    let price = ctx.accounts.plot.last_clearing_price * GD_UNIT;
    gd::transfer(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.player_gd, &ctx.accounts.treasury, price)?;
    ctx.accounts.plot.owner = Some(ctx.accounts.authority.key());
    Ok(())
}

#[derive(Accounts)]
pub struct SetLease<'info> {
    #[account(mut)]
    pub plot: Account<'info, Plot>,
    pub owner: Signer<'info>,
}

pub fn handle_set_lease(ctx: Context<SetLease>, rate: u64) -> Result<()> {
    let plot = &mut ctx.accounts.plot;
    require!(plot.owner == Some(ctx.accounts.owner.key()), BazaarError::NotPlotOwner);
    plot.lease_rate = rate;
    Ok(())
}

#[derive(Accounts)]
pub struct TakeLease<'info> {
    #[account(mut)]
    pub plot: Account<'info, Plot>,
    pub tenant: Signer<'info>,
}

pub fn handle_take_lease(ctx: Context<TakeLease>) -> Result<()> {
    let plot = &mut ctx.accounts.plot;
    require!(plot.owner.is_some() && plot.lease_rate > 0, BazaarError::NotLeaseable);
    require!(plot.owner != Some(ctx.accounts.tenant.key()), BazaarError::Unauthorized);
    require!(plot.lessee.is_none(), BazaarError::PlotOccupied);
    plot.lessee = Some(ctx.accounts.tenant.key());
    Ok(())
}
