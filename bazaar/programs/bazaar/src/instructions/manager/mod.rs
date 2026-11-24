use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::BazaarError;

#[derive(Accounts)]
pub struct HireManager<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Manager::INIT_SPACE,
        seeds = [b"manager", business.key().as_ref()],
        bump
    )]
    pub manager: Account<'info, Manager>,
    #[account(mut)]
    pub business: Account<'info, Business>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_hire_manager(
    ctx: Context<HireManager>,
    session_key: Pubkey,
    strategy: ManagerStrategy,
    floor_price_cents: u16,
    ceiling_price_cents: u16,
    daily_wage: u64,
) -> Result<()> {
    let business = &mut ctx.accounts.business;
    let manager = &mut ctx.accounts.manager;
    require!(business.owner == ctx.accounts.owner.key(), BazaarError::Unauthorized);

    manager.season_id = business.season_id;
    manager.business = business.key();
    manager.session_key = session_key;
    manager.strategy = strategy;
    manager.floor_price_cents = floor_price_cents;
    manager.ceiling_price_cents = ceiling_price_cents;
    manager.daily_wage = daily_wage;
    manager.is_active = true;

    business.manager = Some(session_key);
    Ok(())
}

#[derive(Accounts)]
pub struct FireManager<'info> {
    #[account(mut)]
    pub manager: Account<'info, Manager>,
    #[account(mut)]
    pub business: Account<'info, Business>,
    pub owner: Signer<'info>,
}

pub fn handle_fire_manager(ctx: Context<FireManager>) -> Result<()> {
    let business = &mut ctx.accounts.business;
    let manager = &mut ctx.accounts.manager;
    require!(business.owner == ctx.accounts.owner.key(), BazaarError::Unauthorized);

    manager.is_active = false;
    business.manager = None;
    Ok(())
}
