use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Season {
    pub id: u64,
    pub neighborhood_id: u64,
    pub authority: Pubkey,
    pub started_at: i64,
    pub day: u8,                          // 1..=7
    pub pot: u64,                         // player stakes + sponsorship
    pub sponsor_pot: u64,                 // sponsored funding pool
    pub status: SeasonStatus,             // Lobby, MarketHours, Overnight, Settled
    pub gd_mint: Pubkey,                  // Ephemeral SPL mint for this season
    pub day_opened_at: i64,
    pub market_hours_end: i64,
    pub player_count: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum SeasonStatus {
    #[default]
    Lobby,
    MarketHours,
    Overnight,
    Settled,
}
