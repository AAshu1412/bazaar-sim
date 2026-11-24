use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Plot {
    pub season_id: u64,
    pub plot_id: u16,                     // 0..19
    pub tier: PlotTier,                   // Corner, MainStreet, SideStreet, Alley
    pub street: u8,                       // 0: MagicBlock Blvd, 1: Main St, 2: Side St, 3: Alley
    pub position: u8,                     // order along street (0..4)
    pub owner: Option<Pubkey>,
    pub lessee: Option<Pubkey>,
    pub lease_rate: u64,                  // GD charged per day if leased
    pub last_clearing_price: u64,         // for property net-worth valuation
    pub business: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum PlotTier {
    #[default]
    Alley,        // 0.6x traffic, 80 GD/day
    SideStreet,   // 1.0x traffic, 250 GD/day
    MainStreet,   // 1.5x traffic, 500 GD/day
    Corner,       // 2.0x traffic, 800 GD/day (min rep 40)
}
