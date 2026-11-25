use anchor_lang::prelude::*;

/// Result of one sealed-bid wholesale auction. One per (season, auction_id), so an auction can only be bid on once.
#[account]
#[derive(InitSpace)]
pub struct AuctionResult {
    pub season: Pubkey,
    pub bidder: Pubkey,
    pub auction_id: u64,
    pub units: u32,
    pub bid: u64,          // raw GD (cents)
    pub rivals: [u64; 3],  // the three rival bots' bids, derived on-chain
    pub won: bool,
    pub slot: u64,
}
