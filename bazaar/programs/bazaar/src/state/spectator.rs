use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SpectatorMarket {
    pub season_id: u64,
    pub day: u8,
    pub kind: MarketKind,
    pub total_pool: u64,
    pub option_a_pool: u64,
    pub option_b_pool: u64,
    pub resolved: bool,
    pub winning_option: u8,               // 1 for A, 2 for B
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum MarketKind {
    #[default]
    TopDailyRevenue,                      // Player A vs Field
    MarginCallTriggered,                  // Will bank trigger liquidation today?
    HighestClearingAuctionPlot,           // Plot Corner 0 vs Corner 3
}

#[account]
#[derive(InitSpace)]
pub struct Sponsor {
    pub season_id: u64,
    pub street: u8,
    #[max_len(32)]
    pub name: String,                     // e.g. "MagicBlock Boulevard"
    pub contribution_lamports: u64,
    pub sponsor_wallet: Pubkey,
}
