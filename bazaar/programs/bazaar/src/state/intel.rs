use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ScoutReport {                  // Private ER (encrypted for buyer)
    pub season_id: u64,
    pub buyer: Pubkey,
    pub target_business: Pubkey,
    pub day: u8,
    pub encrypted_payload: [u8; 64],      // Contains revealed inventory and unit cost
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct BuyoutOffer {                  // Private ER (M&A offer)
    pub season_id: u64,
    pub bidder: Pubkey,
    pub target_asset: Pubkey,
    pub encrypted_amount: [u8; 32],       // sealed in TDX
    pub offer_amount: u64,
    pub expires_at: i64,
    pub is_accepted: bool,
}
