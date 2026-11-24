use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;
use state::*;

declare_id!("394dL2jzTtXjc3tWKTL2cPYyS7rcADAM338FbVumWSSi");

#[program]
pub mod bazaar {
    use super::*;

    // ─── SEASON LIFECYCLE ───
    pub fn create_season(
        ctx: Context<CreateSeason>,
        season_id: u64,
        neighborhood_id: u64,
        stake_amount: u64,
    ) -> Result<()> {
        handle_create_season(ctx, season_id, neighborhood_id, stake_amount)
    }

    pub fn open_day(ctx: Context<OpenDay>, season_id: u64) -> Result<()> {
        handle_open_day(ctx, season_id)
    }

    pub fn close_day(ctx: Context<CloseDay>, season_id: u64) -> Result<()> {
        handle_close_day(ctx, season_id)
    }

    // ─── PROPERTY & PLOTS ───
    pub fn initialize_plot(
        ctx: Context<InitializePlot>,
        season_id: u64,
        plot_id: u16,
        tier: PlotTier,
        street: u8,
        position: u8,
    ) -> Result<()> {
        handle_initialize_plot(ctx, season_id, plot_id, tier, street, position)
    }

    pub fn set_lease(ctx: Context<SetLease>, rate: u64) -> Result<()> {
        handle_set_lease(ctx, rate)
    }

    pub fn take_lease(ctx: Context<TakeLease>) -> Result<()> {
        handle_take_lease(ctx)
    }

    // ─── BUSINESS & UPGRADES ───
    pub fn open_business(
        ctx: Context<OpenBusiness>,
        kind: BusinessKind,
        initial_price_cents: u16,
    ) -> Result<()> {
        handle_open_business(ctx, kind, initial_price_cents)
    }

    pub fn buy_upgrade(ctx: Context<BuyUpgrade>, upgrade_flag: u8) -> Result<()> {
        handle_buy_upgrade(ctx, upgrade_flag)
    }

    pub fn set_business_price(ctx: Context<SetBusinessPrice>, new_price_cents: u16) -> Result<()> {
        handle_set_business_price(ctx, new_price_cents)
    }

    // ─── DEFI & LOANS ───
    pub fn take_loan(
        ctx: Context<TakeLoan>,
        season_id: u64,
        principal: u64,
        rate_bps_per_day: u16,
    ) -> Result<()> {
        handle_take_loan(ctx, season_id, principal, rate_bps_per_day)
    }

    pub fn repay_loan(ctx: Context<RepayLoan>, payment_amount: u64) -> Result<()> {
        handle_repay_loan(ctx, payment_amount)
    }

    // ─── MANAGER AGENTS ───
    pub fn hire_manager(
        ctx: Context<HireManager>,
        session_key: Pubkey,
        strategy: ManagerStrategy,
        floor_price_cents: u16,
        ceiling_price_cents: u16,
        daily_wage: u64,
    ) -> Result<()> {
        handle_hire_manager(
            ctx,
            session_key,
            strategy,
            floor_price_cents,
            ceiling_price_cents,
            daily_wage,
        )
    }

    pub fn fire_manager(ctx: Context<FireManager>) -> Result<()> {
        handle_fire_manager(ctx)
    }

    // ─── INTEL & BUYOUTS ───
    pub fn buy_scout(
        ctx: Context<BuyScout>,
        season_id: u64,
        day: u8,
        encrypted_payload: [u8; 64],
    ) -> Result<()> {
        handle_buy_scout(ctx, season_id, day, encrypted_payload)
    }

    pub fn make_buyout_offer(
        ctx: Context<MakeBuyoutOffer>,
        season_id: u64,
        offer_amount: u64,
        duration_secs: i64,
    ) -> Result<()> {
        handle_make_buyout_offer(ctx, season_id, offer_amount, duration_secs)
    }

    // ─── ORACLE MARKET SIGNALS ───
    pub fn apply_market_signals(
        ctx: Context<ApplyMarketSignals>,
        sol_1h_change_bps: i16,
        btc_volatility_bps: u16,
    ) -> Result<()> {
        handle_apply_market_signals(ctx, sol_1h_change_bps, btc_volatility_bps)
    }

    // ─── SPECTATORS & SPONSORSHIP ───
    pub fn open_spectator_market(
        ctx: Context<OpenSpectatorMarket>,
        day: u8,
        kind: MarketKind,
    ) -> Result<()> {
        handle_open_spectator_market(ctx, day, kind)
    }

    pub fn sponsor_street(
        ctx: Context<SponsorStreet>,
        street: u8,
        name: String,
        contribution: u64,
    ) -> Result<()> {
        handle_sponsor_street(ctx, street, name, contribution)
    }
}
