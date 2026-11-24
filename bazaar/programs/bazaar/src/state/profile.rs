use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlayerProfile {                // Persists across seasons
    pub authority: Pubkey,
    pub reputation: u8,                   // 0..100 (starts at 20)
    pub seasons_played: u16,
    pub lifetime_net_worth: i64,
    pub tutorial_stage: u8,               // Uncle Ravi progressive unlock (0..3)
}
