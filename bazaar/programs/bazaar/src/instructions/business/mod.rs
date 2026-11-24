use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::BazaarError;

#[derive(Accounts)]
pub struct OpenBusiness<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Business::INIT_SPACE,
        seeds = [b"business", plot.key().as_ref()],
        bump
    )]
    pub business: Account<'info, Business>,
    #[account(mut)]
    pub plot: Account<'info, Plot>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_open_business(
    ctx: Context<OpenBusiness>,
    kind: BusinessKind,
    initial_price_cents: u16,
) -> Result<()> {
    let plot = &mut ctx.accounts.plot;
    let business = &mut ctx.accounts.business;

    // Must either own or lease the plot
    let caller = ctx.accounts.owner.key();
    let is_authorized = plot.owner == Some(caller) || plot.lessee == Some(caller);
    require!(is_authorized, BazaarError::NotPlotOwner);
    require!(plot.business.is_none(), BazaarError::PlotOccupied);

    business.season_id = plot.season_id;
    business.plot = plot.key();
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

    plot.business = Some(business.key());
    Ok(())
}

#[derive(Accounts)]
pub struct BuyUpgrade<'info> {
    #[account(mut)]
    pub business: Account<'info, Business>,
    pub owner: Signer<'info>,
}

pub fn handle_buy_upgrade(ctx: Context<BuyUpgrade>, upgrade_flag: u8) -> Result<()> {
    let business = &mut ctx.accounts.business;
    require!(business.owner == ctx.accounts.owner.key(), BazaarError::Unauthorized);
    require!((business.upgrades & upgrade_flag) == 0, BazaarError::UpgradeAlreadyOwned);

    business.upgrades |= upgrade_flag;
    Ok(())
}

#[derive(Accounts)]
pub struct SetBusinessPrice<'info> {
    #[account(mut)]
    pub business: Account<'info, Business>,
    pub signer: Signer<'info>,
}

pub fn handle_set_business_price(ctx: Context<SetBusinessPrice>, new_price_cents: u16) -> Result<()> {
    let business = &mut ctx.accounts.business;
    let signer = ctx.accounts.signer.key();
    
    // Caller is owner or authorized manager session key
    let authorized = business.owner == signer || business.manager == Some(signer);
    require!(authorized, BazaarError::Unauthorized);

    business.price_cents = new_price_cents;
    Ok(())
}
