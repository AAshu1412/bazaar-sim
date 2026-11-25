pub const MAX_PLAYERS: usize = 16;
pub const TOTAL_PLOTS: usize = 20;
pub const DEFAULT_SEASON_DURATION_DAYS: u8 = 7;
pub const DAY_MARKET_HOURS_SECS: i64 = 300; // 5 minutes
pub const DAY_OVERNIGHT_HOURS_SECS: i64 = 600; // 10 minutes demo
pub const DEFAULT_STAKE_LAMPORTS: u64 = 1_000_000; // 0.001 SOL ultra-low
pub const INITIAL_GD_BALANCE: u64 = 10_000;
pub const INITIAL_REPUTATION: u8 = 20;

pub const CORNER_RENT_GD: u64 = 800;
pub const MAIN_STREET_RENT_GD: u64 = 500;
pub const SIDE_STREET_RENT_GD: u64 = 250;
pub const ALLEY_RENT_GD: u64 = 80;

pub const BASE_DEMAND: u64 = 8;
pub const AUCTION_WINDOW_SECS: i64 = 15;
pub const SCOUT_COST_GD: u64 = 500;
pub const LIQUIDATION_LTV_BPS: u16 = 8000; // 80.00%

// Pyth price feed ids (https://pyth.network/developers/price-feed-ids)
pub const SOL_USD_FEED_ID: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
pub const BTC_USD_FEED_ID: &str = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
pub const MAX_PRICE_AGE_SECS: u64 = 120;   // reject stale oracle data
pub const SIGNAL_WINDOW_SECS: i64 = 3600;  // reference price rolls hourly
