use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod gd;
pub mod instructions;
pub mod state;
pub mod utils;

use ephemeral_rollups_sdk::anchor::ephemeral;
use instructions::*;
use state::*;

declare_id!("GT36pVzQ6NczDeJaL317uGsx1fT1SaKpvSvzUjaPqKTb");

#[ephemeral]
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

    pub fn join_season(ctx: Context<JoinSeason>) -> Result<()> {
        handle_join_season(ctx)
    }

    pub fn open_day(ctx: Context<OpenDay>) -> Result<()> {
        handle_open_day(ctx)
    }

    pub fn close_day(ctx: Context<CloseDay>) -> Result<()> {
        handle_close_day(ctx)
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

    pub fn claim_plot(ctx: Context<ClaimPlot>) -> Result<()> {
        handle_claim_plot(ctx)
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

    pub fn restock(ctx: Context<Restock>, units: u32) -> Result<()> {
        handle_restock(ctx, units)
    }

    /// Sealed-bid wholesale auction; a winning bid is paid in GD and restocks the shop
    pub fn bid_auction(ctx: Context<BidAuction>, auction_id: u64, units: u32, bid: u64) -> Result<()> {
        handle_bid_auction(ctx, auction_id, units, bid)
    }

    // ─── EPHEMERAL ROLLUP ───
    pub fn init_ledger(ctx: Context<InitLedger>) -> Result<()> {
        handle_init_ledger(ctx)
    }
    pub fn delegate_shop(ctx: Context<DelegateShop>, validator: Option<Pubkey>) -> Result<()> {
        handle_delegate_shop(ctx, validator)
    }
    pub fn settle_shop(ctx: Context<SettleShop>) -> Result<()> {
        handle_settle_shop(ctx)
    }
    pub fn er_restock(ctx: Context<ErShop>, units: u32) -> Result<()> {
        handle_er_restock(ctx, units)
    }
    pub fn er_buy_upgrade(ctx: Context<ErShop>, upgrade_flag: u8) -> Result<()> {
        handle_er_buy_upgrade(ctx, upgrade_flag)
    }
    pub fn er_bid_auction(ctx: Context<ErShop>, auction_id: u64, units: u32, bid: u64) -> Result<()> {
        handle_er_bid_auction(ctx, auction_id, units, bid)
    }
    pub fn er_serve_customers(ctx: Context<ErServe>, count: u16) -> Result<()> {
        handle_er_serve_customers(ctx, count)
    }
    pub fn commit_shop(ctx: Context<CommitShop>) -> Result<()> {
        handle_commit_shop(ctx)
    }
    pub fn undelegate_shop(ctx: Context<CommitShop>) -> Result<()> {
        handle_undelegate_shop(ctx)
    }

    /// Town population buys from a shop (season authority / its session key only)
    pub fn serve_customers(ctx: Context<ServeCustomers>, count: u16) -> Result<()> {
        handle_serve_customers(ctx, count)
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
    pub fn apply_market_signals(ctx: Context<ApplyMarketSignals>) -> Result<()> {
        handle_apply_market_signals(ctx)
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
