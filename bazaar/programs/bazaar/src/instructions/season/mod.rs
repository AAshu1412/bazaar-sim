use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use session_keys::{session_auth_or, Session, SessionError, SessionToken};
use crate::constants::*;
use crate::errors::BazaarError;
use crate::gd;
use crate::state::*;

// Every game instruction takes (authority, signer, session_token): `authority` is the player's wallet pubkey
// (identity only, never asked to sign); `signer` is either that wallet or a MagicBlock session key whose
// SessionToken names the wallet as its authority. The wallet therefore signs once, to start a session.

#[derive(Accounts, Session)]
#[instruction(season_id: u64)]
pub struct CreateSeason<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + Season::INIT_SPACE,
        seeds = [b"season", authority.key().as_ref(), season_id.to_le_bytes().as_ref()],
        bump
    )]
    pub season: Account<'info, Season>,
    #[account(
        init,
        payer = signer,
        seeds = [b"gdmint", season.key().as_ref()],
        bump,
        mint::decimals = GD_DECIMALS,
        mint::authority = season
    )]
    pub gd_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = signer,
        seeds = [b"treasury", season.key().as_ref()],
        bump,
        token::mint = gd_mint,
        token::authority = season
    )]
    pub treasury: Account<'info, TokenAccount>,
    /// CHECK: the wallet that owns this season (identity only)
    pub authority: UncheckedAccount<'info>,
    #[session(signer = signer, authority = authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[session_auth_or(ctx.accounts.authority.key() == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_create_season(
    ctx: Context<CreateSeason>,
    season_id: u64,
    neighborhood_id: u64,
    stake_amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    {
        let season = &mut ctx.accounts.season;
        season.id = season_id;
        season.neighborhood_id = neighborhood_id;
        season.authority = ctx.accounts.authority.key();
        season.started_at = clock.unix_timestamp;
        season.day = 1;
        season.pot = if stake_amount > 0 { stake_amount } else { DEFAULT_STAKE_LAMPORTS };
        season.sponsor_pot = 0;
        season.status = SeasonStatus::Lobby;
        season.gd_mint = ctx.accounts.gd_mint.key();
        season.day_opened_at = clock.unix_timestamp;
        season.market_hours_end = clock.unix_timestamp + DAY_MARKET_HOURS_SECS;
        season.player_count = 0;
    }
    // the town's population fund: customers pay shops out of this
    gd::mint_to(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.gd_mint, &ctx.accounts.treasury, TREASURY_GD * GD_UNIT)?;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct JoinSeason<'info> {
    #[account(
        mut,
        seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()],
        bump
    )]
    pub season: Account<'info, Season>,
    #[account(
        init,
        payer = signer,
        space = 8 + PlayerState::INIT_SPACE,
        seeds = [b"player", season.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub player: Account<'info, PlayerState>,
    #[account(
        init,
        payer = signer,
        seeds = [b"gd", season.key().as_ref(), authority.key().as_ref()],
        bump,
        token::mint = gd_mint,
        token::authority = season
    )]
    pub player_gd: Account<'info, TokenAccount>,
    #[account(mut, address = season.gd_mint)]
    pub gd_mint: Account<'info, Mint>,
    /// CHECK: the wallet joining (identity only)
    pub authority: UncheckedAccount<'info>,
    #[session(signer = signer, authority = authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Creates the player's state and GD token account and mints the starting stake of 10,000 GD into it.
#[session_auth_or(ctx.accounts.authority.key() == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_join_season(ctx: Context<JoinSeason>) -> Result<()> {
    require!((ctx.accounts.season.player_count as usize) < MAX_PLAYERS, BazaarError::SeasonFull);
    let clock = Clock::get()?;
    {
        let p = &mut ctx.accounts.player;
        p.authority = ctx.accounts.authority.key();
        p.season = ctx.accounts.season.key();
        p.reputation = INITIAL_REPUTATION;
        p.joined_at = clock.unix_timestamp;
        p.customers_served = 0;
        p.gd_earned = 0;
        p.gd_spent = 0;
    }
    ctx.accounts.season.player_count += 1;
    gd::mint_to(&ctx.accounts.token_program, &ctx.accounts.season, &ctx.accounts.gd_mint, &ctx.accounts.player_gd, INITIAL_GD_BALANCE * GD_UNIT)?;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct OpenDay<'info> {
    #[account(mut, seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[session(signer = signer, authority = season.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
}

#[session_auth_or(ctx.accounts.season.authority == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_open_day(ctx: Context<OpenDay>) -> Result<()> {
    let season = &mut ctx.accounts.season;
    let clock = Clock::get()?;
    season.status = SeasonStatus::MarketHours;
    season.day_opened_at = clock.unix_timestamp;
    season.market_hours_end = clock.unix_timestamp + DAY_MARKET_HOURS_SECS;
    Ok(())
}

#[derive(Accounts, Session)]
pub struct CloseDay<'info> {
    #[account(mut, seeds = [b"season", season.authority.as_ref(), season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[session(signer = signer, authority = season.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
    pub signer: Signer<'info>,
}

#[session_auth_or(ctx.accounts.season.authority == ctx.accounts.signer.key(), BazaarError::Unauthorized)]
pub fn handle_close_day(ctx: Context<CloseDay>) -> Result<()> {
    let season = &mut ctx.accounts.season;
    season.status = SeasonStatus::Overnight;
    if season.day < DEFAULT_SEASON_DURATION_DAYS {
        season.day += 1;
    }
    Ok(())
}
