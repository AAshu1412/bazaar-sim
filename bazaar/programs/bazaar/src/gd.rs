//! GD token plumbing. Every GD token account (treasury, players) is owned by the season PDA, so the program
//! signs all transfers; instructions decide who may move what.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
use crate::state::Season;

pub fn season_bump(season: &Season) -> u8 {
    Pubkey::find_program_address(&[b"season", season.authority.as_ref(), &season.id.to_le_bytes()], &crate::ID).1
}

pub fn transfer<'info>(
    token_program: &Program<'info, Token>,
    season: &Account<'info, Season>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    amount: u64,
) -> Result<()> {
    let id = season.id.to_le_bytes();
    let bump = [season_bump(season)];
    let seeds: &[&[u8]] = &[b"season", season.authority.as_ref(), &id, &bump];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.key(),
            Transfer { from: from.to_account_info(), to: to.to_account_info(), authority: season.to_account_info() },
            &[seeds],
        ),
        amount,
    )
}

pub fn mint_to<'info>(
    token_program: &Program<'info, Token>,
    season: &Account<'info, Season>,
    mint: &Account<'info, Mint>,
    to: &Account<'info, TokenAccount>,
    amount: u64,
) -> Result<()> {
    let id = season.id.to_le_bytes();
    let bump = [season_bump(season)];
    let seeds: &[&[u8]] = &[b"season", season.authority.as_ref(), &id, &bump];
    token::mint_to(
        CpiContext::new_with_signer(
            token_program.key(),
            MintTo { mint: mint.to_account_info(), to: to.to_account_info(), authority: season.to_account_info() },
            &[seeds],
        ),
        amount,
    )
}
