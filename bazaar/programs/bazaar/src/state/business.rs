use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Business {
    pub season_id: u64,
    pub plot: Pubkey,
    pub owner: Pubkey,
    pub kind: BusinessKind,
    pub price_cents: u16,                 // public
    pub upgrades: u8,                     // bitflags: 1:Signage, 2:Storage, 4:SecondCounter, 8:Brand
    pub manager: Option<Pubkey>,          // Manager agent session key
    pub revenue_today: u64,
    pub revenue_trailing_3d: [u64; 3],    // used for business valuation
    // Private ER (sealed inside TDX):
    pub inventory: u32,
    pub unit_cost_cents: u16,
    pub total_lifetime_revenue: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum BusinessKind {
    #[default]
    CoffeeCart,   // 2,000 GD - BTC volatility driven
    StreetFood,   // 3,500 GD - perishable (10% decay/tick), lunch spike
    Electronics,  // 8,000 GD - Pyth SOL/USD 1h % change driven
    FlowerStall,  // 2,500 GD - perishable, spikes on VRF festival
    Bookshop,     // 4,000 GD - durable, steady low volatility
}

// Upgrade Bitflags
pub const UPGRADE_SIGNAGE: u8 = 1 << 0;       // +15% traffic capture (1,000 GD)
pub const UPGRADE_STORAGE: u8 = 1 << 1;       // +100% inventory capacity (1,500 GD)
pub const UPGRADE_SECOND_COUNTER: u8 = 1 << 2;// serves 2 customers/tick (3,000 GD)
pub const UPGRADE_BRAND: u8 = 1 << 3;         // +10% price tolerance (5,000 GD)
