use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::BazaarError;

#[derive(Accounts)]
#[instruction(season_id: u64, plot_id: u16)]
pub struct InitializePlot<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Plot::INIT_SPACE,
        seeds = [b"plot", season_id.to_le_bytes().as_ref(), plot_id.to_le_bytes().as_ref()],
        bump
    )]
    pub plot: Account<'info, Plot>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_plot(
    ctx: Context<InitializePlot>,
    season_id: u64,
    plot_id: u16,
    tier: PlotTier,
    street: u8,
    position: u8,
) -> Result<()> {
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
    };
    plot.business = None;
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
    require!(plot.lessee.is_none(), BazaarError::PlotOccupied);
    plot.lessee = Some(ctx.accounts.tenant.key());
    Ok(())
}
