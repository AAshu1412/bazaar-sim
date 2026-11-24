use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Manager {
    pub season_id: u64,
    pub business: Pubkey,
    pub session_key: Pubkey,              // Scoped Session Key
    pub strategy: ManagerStrategy,
    pub floor_price_cents: u16,
    pub ceiling_price_cents: u16,
    pub daily_wage: u64,                  // 300..1000 GD
    pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum ManagerStrategy {
    #[default]
    Undercutter,      // 5% below cheapest competitor (floor = cost + 10%)
    Premium,          // Fixed margin, quality branding
    InventoryGuard,   // Scales price up as stock drops
}
