use anchor_lang::prelude::*;

/// Per-shop GD ledger used while the shop is delegated to an Ephemeral Rollup.
/// SPL token accounts cannot be delegated by this program, so during an ER session GD earned and spent is tracked
/// here. `delegate_shop` escrows the player's balance in the treasury (`gd_snapshot`), the rollup records what is
/// earned and spent (`gd_credit`), spending is checked against `gd_snapshot + gd_credit`, and `settle_shop` pays that
/// sum back into the player's token account after undelegation.
#[account]
#[derive(InitSpace)]
pub struct ShopLedger {
    pub business: Pubkey,
    pub owner: Pubkey,
    pub season: Pubkey,
    pub gd_snapshot: u64, // GD escrowed in the treasury for the current rollup session (raw)
    pub gd_credit: i64,   // net GD earned (+) / spent (-) since then, not yet settled (raw)
    pub customers_served: u64,
    pub last_auction_id: u64,
    pub last_units: u32,
    pub last_bid: u64,
    pub last_rivals: [u64; 3],
    pub last_won: bool,
    pub last_requested_at: i64, // unix time of the last auction request
}

impl ShopLedger {
    /// A bid is reserved and its VRF randomness has not arrived yet (rival bids are still zero).
    pub fn auction_pending(&self) -> bool {
        self.last_bid > 0 && self.last_rivals == [0; 3]
    }
    /// Returns a reserved bid and forgets the request, so a late callback is rejected.
    pub fn cancel_pending_auction(&mut self) {
        if self.auction_pending() {
            self.gd_credit += self.last_bid as i64;
            self.last_bid = 0;
        }
    }
}
