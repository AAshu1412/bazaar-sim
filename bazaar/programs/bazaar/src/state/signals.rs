use anchor_lang::prelude::*;

/// Oracle-derived demand signals for a season, written by `apply_market_signals`
/// from real Pyth price updates. Change is measured against a reference price that
/// rolls every SIGNAL_WINDOW_SECS, so it approximates a 1h move.
#[account]
#[derive(InitSpace)]
pub struct MarketSignals {
    pub season_id: u64,
    pub sol_price: i64,          // latest SOL/USD (scaled by 10^sol_expo)
    pub sol_expo: i32,
    pub sol_ref_price: i64,
    pub sol_ref_ts: i64,
    pub sol_change_bps: i16,     // drives Electronics demand
    pub btc_price: i64,
    pub btc_expo: i32,
    pub btc_ref_price: i64,
    pub btc_ref_ts: i64,
    pub btc_volatility_bps: u16, // |BTC move| vs reference, drives Coffee demand
    pub updated_at: i64,
}
