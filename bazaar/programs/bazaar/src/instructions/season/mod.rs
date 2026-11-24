use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::BazaarError;

#[derive(Accounts)]
#[instruction(season_id: u64)]
pub struct CreateSeason<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Season::INIT_SPACE,
        seeds = [b"season", season_id.to_le_bytes().as_ref()],
        bump
    )]
    pub season: Account<'info, Season>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_season(
    ctx: Context<CreateSeason>,
    season_id: u64,
    neighborhood_id: u64,
    stake_amount: u64,
) -> Result<()> {
    let season = &mut ctx.accounts.season;
    season.id = season_id;
    season.neighborhood_id = neighborhood_id;
    season.authority = ctx.accounts.authority.key();
    let clock = Clock::get()?;
    season.started_at = clock.unix_timestamp;
    season.day = 1;
    season.pot = if stake_amount > 0 { stake_amount } else { DEFAULT_STAKE_LAMPORTS };
    season.sponsor_pot = 0;
    season.status = SeasonStatus::Lobby;
    season.gd_mint = Pubkey::default();
    season.day_opened_at = clock.unix_timestamp;
    season.market_hours_end = clock.unix_timestamp + DAY_MARKET_HOURS_SECS;
    season.player_count = 0;
    Ok(())
}

#[derive(Accounts)]
#[instruction(season_id: u64)]
pub struct OpenDay<'info> {
    #[account(
        mut,
        seeds = [b"season", season_id.to_le_bytes().as_ref()],
        bump
    )]
    pub season: Account<'info, Season>,
    pub cranker: Signer<'info>,
}

pub fn handle_open_day(ctx: Context<OpenDay>, _season_id: u64) -> Result<()> {
    let season = &mut ctx.accounts.season;
    let clock = Clock::get()?;
    season.status = SeasonStatus::MarketHours;
    season.day_opened_at = clock.unix_timestamp;
    season.market_hours_end = clock.unix_timestamp + DAY_MARKET_HOURS_SECS;
    Ok(())
}

#[derive(Accounts)]
#[instruction(season_id: u64)]
pub struct CloseDay<'info> {
    #[account(
        mut,
        seeds = [b"season", season_id.to_le_bytes().as_ref()],
        bump
    )]
    pub season: Account<'info, Season>,
    pub cranker: Signer<'info>,
}

pub fn handle_close_day(ctx: Context<CloseDay>, _season_id: u64) -> Result<()> {
    let season = &mut ctx.accounts.season;
    season.status = SeasonStatus::Overnight;
    if season.day < DEFAULT_SEASON_DURATION_DAYS {
        season.day += 1;
    }
    Ok(())
}
