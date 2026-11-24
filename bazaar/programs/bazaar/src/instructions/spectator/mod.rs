use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(day: u8)]
pub struct OpenSpectatorMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SpectatorMarket::INIT_SPACE,
        seeds = [b"spectator", season.key().as_ref(), &[day]],
        bump
    )]
    pub market: Account<'info, SpectatorMarket>,
    pub season: Account<'info, Season>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_open_spectator_market(
    ctx: Context<OpenSpectatorMarket>,
    day: u8,
    kind: MarketKind,
) -> Result<()> {
    let m = &mut ctx.accounts.market;
    m.season_id = ctx.accounts.season.id;
    m.day = day;
    m.kind = kind;
    m.total_pool = 0;
    m.option_a_pool = 0;
    m.option_b_pool = 0;
    m.resolved = false;
    m.winning_option = 0;
    Ok(())
}

#[derive(Accounts)]
#[instruction(street: u8)]
pub struct SponsorStreet<'info> {
    #[account(
        init,
        payer = sponsor_wallet,
        space = 8 + Sponsor::INIT_SPACE,
        seeds = [b"sponsor", season.key().as_ref(), &[street]],
        bump
    )]
    pub sponsor: Account<'info, Sponsor>,
    #[account(mut)]
    pub season: Account<'info, Season>,
    #[account(mut)]
    pub sponsor_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_sponsor_street(
    ctx: Context<SponsorStreet>,
    street: u8,
    name: String,
    contribution: u64,
) -> Result<()> {
    let sponsor = &mut ctx.accounts.sponsor;
    let season = &mut ctx.accounts.season;

    sponsor.season_id = season.id;
    sponsor.street = street;
    sponsor.name = name;
    sponsor.contribution_lamports = contribution;
    sponsor.sponsor_wallet = ctx.accounts.sponsor_wallet.key();

    season.sponsor_pot += contribution;
    season.pot += contribution;
    Ok(())
}
