use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct BuyScout<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + ScoutReport::INIT_SPACE,
        seeds = [b"scout", buyer.key().as_ref(), target_business.key().as_ref()],
        bump
    )]
    pub scout_report: Account<'info, ScoutReport>,
    pub target_business: Account<'info, Business>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy_scout(
    ctx: Context<BuyScout>,
    season_id: u64,
    day: u8,
    encrypted_payload: [u8; 64],
) -> Result<()> {
    let report = &mut ctx.accounts.scout_report;
    report.season_id = season_id;
    report.buyer = ctx.accounts.buyer.key();
    report.target_business = ctx.accounts.target_business.key();
    report.day = day;
    report.encrypted_payload = encrypted_payload;
    let clock = Clock::get()?;
    report.created_at = clock.unix_timestamp;
    Ok(())
}

#[derive(Accounts)]
pub struct MakeBuyoutOffer<'info> {
    #[account(
        init,
        payer = bidder,
        space = 8 + BuyoutOffer::INIT_SPACE,
        seeds = [b"buyout", bidder.key().as_ref(), target_asset.key().as_ref()],
        bump
    )]
    pub buyout_offer: Account<'info, BuyoutOffer>,
    /// CHECK: Target Plot or Business account
    pub target_asset: AccountInfo<'info>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_make_buyout_offer(
    ctx: Context<MakeBuyoutOffer>,
    season_id: u64,
    offer_amount: u64,
    duration_secs: i64,
) -> Result<()> {
    let offer = &mut ctx.accounts.buyout_offer;
    offer.season_id = season_id;
    offer.bidder = ctx.accounts.bidder.key();
    offer.target_asset = ctx.accounts.target_asset.key();
    offer.encrypted_amount = [0u8; 32];
    offer.offer_amount = offer_amount;
    let clock = Clock::get()?;
    offer.expires_at = clock.unix_timestamp + duration_secs;
    offer.is_accepted = false;
    Ok(())
}
