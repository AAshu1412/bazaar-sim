use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::BazaarError;

#[derive(Accounts)]
pub struct TakeLoan<'info> {
    #[account(
        init,
        payer = borrower,
        space = 8 + Loan::INIT_SPACE,
        seeds = [b"loan", borrower.key().as_ref(), collateral_asset.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    /// CHECK: Plot or Business account used as collateral
    pub collateral_asset: AccountInfo<'info>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_take_loan(
    ctx: Context<TakeLoan>,
    season_id: u64,
    principal: u64,
    rate_bps_per_day: u16,
) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    loan.season_id = season_id;
    loan.borrower = ctx.accounts.borrower.key();
    loan.lender = Pubkey::default(); // NPC Bank
    loan.principal = principal;
    loan.rate_bps_per_day = rate_bps_per_day;
    loan.accrued_interest = 0;
    loan.collateral_asset = ctx.accounts.collateral_asset.key();
    loan.margin_called_at = None;
    loan.is_active = true;
    Ok(())
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    pub borrower: Signer<'info>,
}

pub fn handle_repay_loan(ctx: Context<RepayLoan>, payment_amount: u64) -> Result<()> {
    let loan = &mut ctx.accounts.loan;
    require!(loan.borrower == ctx.accounts.borrower.key(), BazaarError::Unauthorized);

    if payment_amount >= loan.principal + loan.accrued_interest {
        loan.principal = 0;
        loan.accrued_interest = 0;
        loan.is_active = false;
        loan.margin_called_at = None;
    } else {
        loan.principal = loan.principal.saturating_sub(payment_amount);
    }
    Ok(())
}
