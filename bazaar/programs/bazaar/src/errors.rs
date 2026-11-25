use anchor_lang::prelude::*;

#[error_code]
pub enum BazaarError {
    #[msg("Season is not in active state")]
    SeasonNotActive,
    #[msg("Season is full")]
    SeasonFull,
    #[msg("Market hours closed (overnight phase)")]
    MarketClosed,
    #[msg("Unauthorized signer for business or session key")]
    Unauthorized,
    #[msg("Plot already occupied or owned")]
    PlotOccupied,
    #[msg("Plot is not owned by caller")]
    NotPlotOwner,
    #[msg("Plot not available for lease")]
    NotLeaseable,
    #[msg("Insufficient reputation score to bid on Corner plot")]
    InsufficientReputation,
    #[msg("Insufficient GD balance for transaction")]
    InsufficientFunds,
    #[msg("Loan exceeds collateral borrow capacity (max LTV 80%)")]
    ExceedsLtvLimit,
    #[msg("Position not eligible for margin call or liquidation")]
    NotLiquidatable,
    #[msg("Auction bid window is closed")]
    AuctionClosed,
    #[msg("Auction bid is below minimum")]
    BidTooLow,
    #[msg("Manager bounds exceeded: price out of range")]
    PriceOutOfBounds,
    #[msg("Upgrade already purchased on this business")]
    UpgradeAlreadyOwned,
    #[msg("Invalid plot ID or tier")]
    InvalidPlot,
    #[msg("Buyout offer has expired")]
    OfferExpired,
    #[msg("Business is out of stock")]
    OutOfStock,
    #[msg("Inventory capacity exceeded")]
    InventoryFull,
    #[msg("Invalid amount or upgrade flag")]
    InvalidAmount,
    #[msg("An auction is still waiting for its randomness")]
    AuctionPending,
    #[msg("This randomness does not match a pending auction")]
    StaleRandomness,
}
