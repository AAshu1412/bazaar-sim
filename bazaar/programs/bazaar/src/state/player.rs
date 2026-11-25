use anchor_lang::prelude::*;

/// One per (season, wallet). GD itself lives in the player's SPL token account `["gd", season, authority]`.
#[account]
#[derive(InitSpace)]
pub struct PlayerState {
    pub authority: Pubkey,
    pub season: Pubkey,
    pub reputation: u8,
    pub joined_at: i64,
    pub customers_served: u64,
    pub gd_earned: u64, // raw units
    pub gd_spent: u64,  // raw units
}
