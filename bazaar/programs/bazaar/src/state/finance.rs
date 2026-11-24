use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub season_id: u64,
    pub borrower: Pubkey,
    pub lender: Pubkey,                   // Bank PDA or Player
    pub principal: u64,
    pub rate_bps_per_day: u16,            // 300..800 bps (3%..8%)
    pub accrued_interest: u64,
    pub collateral_asset: Pubkey,         // Plot or Business PDA
    pub margin_called_at: Option<i64>,    // set if debt > 80% LTV
    pub is_active: bool,
}
