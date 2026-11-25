use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct ApplyMarketSignals<'info> {
    #[account(seeds = [b"season", season.id.to_le_bytes().as_ref()], bump)]
    pub season: Account<'info, Season>,
    #[account(
        init_if_needed,
        payer = cranker,
        space = 8 + MarketSignals::INIT_SPACE,
        seeds = [b"signals", season.key().as_ref()],
        bump
    )]
    pub signals: Account<'info, MarketSignals>,
    /// Pyth SOL/USD PriceUpdateV2 (owner-checked by the SDK; feed id checked in handler)
    pub sol_feed: Account<'info, PriceUpdateV2>,
    /// Pyth BTC/USD PriceUpdateV2
    pub btc_feed: Account<'info, PriceUpdateV2>,
    #[account(mut)]
    pub cranker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Signed basis-point move of `price` vs `reference`.
fn move_bps(price: i64, reference: i64) -> i128 {
    if reference <= 0 {
        return 0;
    }
    (price as i128 - reference as i128) * 10_000 / reference as i128
}

/// Permissionless: anyone can crank, the data comes from the Pyth account, not the caller.
pub fn handle_apply_market_signals(ctx: Context<ApplyMarketSignals>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let sol = ctx.accounts.sol_feed.get_price_no_older_than(
        &clock,
        MAX_PRICE_AGE_SECS,
        &get_feed_id_from_hex(SOL_USD_FEED_ID)?,
    )?;
    // BTC is best-effort: sponsored push feeds for it can go stale, which must not block SOL.
    let btc = ctx.accounts
        .btc_feed
        .get_price_no_older_than(&clock, MAX_PRICE_AGE_SECS, &get_feed_id_from_hex(BTC_USD_FEED_ID)?)
        .ok();

    let s = &mut ctx.accounts.signals;
    s.season_id = ctx.accounts.season.id;

    // A changed exponent makes the old reference price incomparable: restart the window.
    if s.sol_expo != sol.exponent {
        s.sol_ref_ts = 0;
    }
    let sol_move = if s.sol_ref_ts == 0 { 0 } else { move_bps(sol.price, s.sol_ref_price) };
    s.sol_change_bps = sol_move.clamp(i16::MIN as i128, i16::MAX as i128) as i16;
    s.sol_price = sol.price;
    s.sol_expo = sol.exponent;
    if s.sol_ref_ts == 0 || now - s.sol_ref_ts >= SIGNAL_WINDOW_SECS {
        s.sol_ref_price = sol.price;
        s.sol_ref_ts = now;
    }

    if let Some(btc) = btc {
        if s.btc_expo != btc.exponent {
            s.btc_ref_ts = 0;
        }
        let btc_move = if s.btc_ref_ts == 0 { 0 } else { move_bps(btc.price, s.btc_ref_price) };
        s.btc_volatility_bps = btc_move.unsigned_abs().min(u16::MAX as u128) as u16;
        s.btc_price = btc.price;
        s.btc_expo = btc.exponent;
        if s.btc_ref_ts == 0 || now - s.btc_ref_ts >= SIGNAL_WINDOW_SECS {
            s.btc_ref_price = btc.price;
            s.btc_ref_ts = now;
        }
    }
    s.updated_at = now;
    Ok(())
}
