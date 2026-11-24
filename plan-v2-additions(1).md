# Bazaar v2 — Additions to plan.md

**Purpose:** Additions on top of `plan.md` that turn Bazaar from a single 5-minute round into a persistent onchain tycoon season. This file covers only what is *new* or *changed*. Anything not mentioned here still follows plan.md.

**Thesis change:**
- plan.md pitch: *"A 4-player live price-war game."*
- v2 pitch: *"The first onchain tycoon where the money is real. A persistent neighborhood economy where every system (rent, loans, auctions, managers, market demand) runs on MagicBlock."*

**Why this wins:** v1 competes on how much of the stack it uses. v2 competes on category. Judges have seen pot games. Nobody has submitted a persistent business sim where:
- businesses are owned assets,
- debt is enforced onchain,
- property is won in sealed auctions,
- demand moves with real markets.

That combination is the Entertainment Finance brief.

---

## 1. Structural change: Seasons and Days

### 1.1 What changes

| | plan.md (v1) | v2 |
|---|---|---|
| Unit of play | 1 round, 5 min | 1 season = 7 days, each day = one 5-min live session |
| State between rounds | None | Businesses, cash, debt, property, reputation all persist |
| Pot | Per round | Per season (stakes + sponsor money), plus small daily prizes |
| Players | 4 | 8–16 per neighborhood |
| Map | 4 stalls, one street | 1 neighborhood, ~20 plots across 4 streets |
| Win condition | Most revenue in the round | Highest **net worth** at season end |

### 1.2 Day cycle

```
[Opening bell]   Plot and supply auctions resolve. Loans accrue. Rent is charged.
[Market hours]   5 min live: customers flow, prices adjust, events fire.
[Closing bell]   Day revenue booked. Daily leaderboard. Spectator bets settle.
[Overnight]      Offline phase: managers run stalls at reduced demand. Cranks keep ticking.
```

Market hours run on a fixed schedule (for example 3 sessions a day at set IST/UTC times). Overnight is when cranks keep the world running without players present, which shows off cranks better than anything in v1.

### 1.3 Net worth (season score)

```
net_worth = cash
          + Σ(property_value)
          + Σ(business_value)
          + inventory_value
          − outstanding_debt
```

- `property_value` = the last clearing price for that plot tier, decayed 5% per day without a sale.
- `business_value` = trailing 3-day revenue × 2.

The season pot splits pro-rata on **positive** net worth. Anyone at zero or below gets nothing. This keeps the solvent pro-rata model from plan.md and adds a real way to go bankrupt.

---

## 2. Expansion: property and multiple businesses

### 2.1 The map

- One neighborhood with 4 streets and about 20 plots.
- Each plot has a **tier** (Corner, Main Street, Side Street, Alley) that scales foot traffic:

| Tier | Plots | Traffic multiplier | Base rent / day |
|---|---|---|---|
| Corner | 4 | 2.0× | 800 GD |
| Main Street | 6 | 1.5× | 500 GD |
| Side Street | 6 | 1.0× | 250 GD |
| Alley | 4 | 0.6× | 80 GD |

- Customers spawn at street entrances and walk past plots in order, so a plot's position on the street also matters. A corner sees everyone.

### 2.2 Getting a plot (sealed-bid property auctions)

- At each opening bell, 1–3 vacant plots go to auction on **Private ER**.
- Bids are sealed and revealed all at once, the same hero moment as v1, but now the prize is permanent real estate rather than one restock.
- The winner owns the plot for the rest of the season. Rent is no longer charged; property tax applies instead (see below).
- Players who don't own a plot can lease from someone who does. The lessor sets the rent, and lessees pay it on a crank schedule.

### 2.3 Businesses per plot

Each plot holds one business of one type. You can own several plots and therefore several businesses.

| Business | Setup cost | Inventory model | Demand profile |
|---|---|---|---|
| Coffee cart | 2,000 GD | Fast turnover, low margin | Morning-heavy, steady |
| Street food | 3,500 GD | Perishable (inventory decays 10%/tick unsold) | Lunch spike |
| Electronics | 8,000 GD | Slow turnover, high margin | Tied to market feed (see §6) |
| Flower stall | 2,500 GD | Perishable, event-driven | Spikes on VRF "festival" events |
| Bookshop | 4,000 GD | Durable, low demand | Stable, low volatility |

Each type has its own supply auction, so supply chains differ by product. Multiple product types also let players hedge: someone who owns coffee and electronics behaves differently from someone who owns only flowers.

### 2.4 Upgrades (per business)

| Upgrade | Cost | Effect |
|---|---|---|
| Signage | 1,000 GD | +15% traffic capture at this plot |
| Storage | 1,500 GD | +100% inventory cap |
| Second counter | 3,000 GD | Serves 2 customers per tick instead of 1 |
| Brand | 5,000 GD | Customers tolerate +10% price before switching |

Upgrades add to `business_value` and survive the season.

### 2.5 The "Brand" mechanic changes the customer model

In v1, customers bought from the cheapest stall. In v2 they choose by a utility score:

```
utility(stall) = − price
                 + brand_tolerance × price
                 + traffic_bonus(plot_tier)
                 + reputation_bonus
                 + VRF_noise
```

This makes price wars more interesting: a premium brand on a corner can charge 20% more and still win. Quality competes with price.

---

## 3. Loans and debt

### 3.1 The bank

- An NPC bank offers loans of 2,000, 5,000 or 10,000 GD.
- Interest is 3–8% per day depending on reputation.
- The loan is backed by your property and businesses.

### 3.2 Enforcement by cranks

- Each opening bell, a crank accrues interest on every open loan.
- If `debt > 0.8 × collateral_value`, the **margin call** flag is set. You have one full day to repay or sell assets.
- If you still haven't fixed it the next day, a **liquidation** crank seizes the weakest asset and puts it straight into that day's property auction.

This is real DeFi mechanics (collateral, margin calls, liquidation) inside a game. It may be the strongest single bridge from entertainment to finance you have, because everyone understands "the bank took my shop."

### 3.3 Player-to-player lending (stretch)

- Players can post loan offers with a rate, size and collateral requirement.
- Others accept them.
- The same crank enforcement applies.
- This makes players into banks and adds a second way to make money that isn't running a business.

---

## 4. Hidden information as gameplay

v1 used Private ER only for auction bids. v2 makes hidden information a core mechanic.

### 4.1 What's private by default

| Data | Visible to owner | Visible to others |
|---|---|---|
| Price | Yes | Yes (customers need to see it) |
| Inventory count | Yes | **No** |
| Unit cost (what you paid at supply auction) | Yes | **No** |
| Cash balance | Yes | **No** |
| Debt | Yes | **No**, except when a margin call is public |
| Net worth | Yes | Bracket only (top 25%, 50%, etc.) |

All of this lives in Private ER. Others see prices and foot traffic and have to infer everything else.

### 4.2 Scouting

- Pay 500 GD to hire a scout on a rival business. The scout reveals that business's inventory and unit cost for this day only, and only to you.
- Implementation: a Private ER instruction that reads the sealed state and writes an encrypted copy readable only by the buyer.
- This creates the information-advantage play, the same reason real traders pay for data.

### 4.3 Sealed buyout offers

- Make a sealed offer to buy a rival's business or plot.
- The target sees the offer amount, but nobody else sees it or knows it was made.
- If accepted, the asset transfers atomically.
- Mergers and acquisitions as a mechanic, with Private ER doing the work that makes it fair.

---

## 5. Managers (agent session keys)

### 5.1 The mechanic

- When you own more than one business you can't micromanage them all in 5 minutes, so you hire a manager per business.
- Managers cost 300–1,000 GD per day, scaled by skill tier.
- Each manager is a bot with its own **scoped session key**. It can call `set_price` and `submit_supply_bid` for its assigned business only, within limits you set.

### 5.2 Manager strategies

| Strategy | Behavior |
|---|---|
| Undercutter | Keeps price 5% below the cheapest competitor, with a floor at unit cost + 10% |
| Premium | Holds price at a target margin and ignores rivals |
| Inventory-guard | Raises price as stock runs low so it never sells out |
| Custom (stretch) | Player writes rules in a simple DSL, e.g. `if rival_price < 2.5 then price = 2.4` |

### 5.3 Why this matters for the pitch

- Session keys stop being UX polish and become the gameplay itself.
- Every manager is an autonomous agent signing transactions on the ER, at about the scale of the "AI agents onchain" category judges are watching.
- During overnight phases, only managers are trading, so the world keeps running 24/7.
- This shows a real reason for always-on low-latency compute.

---

## 6. Real-market signals (Pyth Lazer)

### 6.1 What's tied to what

| In-game demand | Real-world feed | Mapping |
|---|---|---|
| Electronics | SOL/USD 1h % change | +5% SOL → +25% electronics demand (clamped ±50%) |
| Coffee | BTC/USD volatility | Higher volatility → more coffee demand ("traders up late") |
| Flowers | None (VRF festivals only) | Keeps one product fully game-driven |
| Food | Steady baseline | Control product |

### 6.2 Why

- "Markets becoming entertainment" taken literally: real crypto market moves reshape the in-game economy live.
- Players who read the real market get an edge, which rewards a real-world skill.
- The demo moment: SOL pumps on screen and electronics shops in Bazaar get flooded with customers.

### 6.3 Safety

- Every feed effect is clamped.
- Record/replay mode for demos, so a flat market during judging doesn't make the game look dead.

---

## 7. Spectator prediction market

### 7.1 The mechanic

- Anyone can watch a live day in spectator mode.
- Spectators can bet on:
  - who earns the most revenue that day,
  - whether a margin call triggers,
  - which plot sells highest at the next auction.
- The market uses a parimutuel pool, settles at closing bell, and runs on the same ER.

### 7.2 Why

- It turns the game into content: people who don't want to run a shop can still take part financially.
- It's the "markets becoming entertainment" half of the theme as its own product line.
- Past Blitz winners like VeilMarket show judges reward prediction markets. This makes one native to your game.

---

## 8. Sponsored streets (funding the economy)

### 8.1 The mechanic

- Each street can be sponsored for a season, for example "Jupiter Avenue" or "Pyth Street".
- The sponsor pays a fixed amount into the season pot.
- In return the sponsor gets:
  - the street name in-game,
  - branded customer types on that street,
  - a stats report (players, foot traffic, transactions).

### 8.2 Why

- This answers Jonas's question: the money comes from brands buying attention, not from new players' stakes.
- The season pot becomes *stakes + sponsorship*, so the average player can come out ahead. That's positive-sum rather than zero-sum, and it removes the biggest economic objection.
- The demo pitch: *"Every street is a billboard. Sponsorship funds the prize pool."*

### 8.3 For the submission

Mock one sponsored street ("MagicBlock Boulevard"), funded by your own devnet SOL, to show the mechanic end to end.

---

## 9. Guided onboarding ("Uncle Ravi")

### 9.1 The character

- A guide in the spirit of Big Ambitions' uncle: a retired shopkeeper who walks a new player through their first day.
- Use an original character and name. Don't copy any Big Ambitions character.

### 9.2 Tutorial arc (first 3 days of a new player's season)

| Day | Uncle Ravi teaches | Unlocks |
|---|---|---|
| 1 | "Lease a stall on Side Street. Set your price. Watch customers." | Leasing, pricing |
| 1 (later) | "Supply auction starts. Bid sealed, nobody sees your number." | Supply auction |
| 2 | "You've got savings. Bank's offering a loan. Careful." | Loans |
| 2 (later) | "A corner plot is up for auction. This is how you grow." | Property auction |
| 3 | "Two shops, one of you. Hire a manager." | Managers |
| 3 (later) | "Curious what the shop across the street paid? Scouts cost money." | Scouting |

Mechanics unlock progressively, so a new player isn't hit with everything at once. This is the main answer to the engagement problem: there's always a next thing to unlock.

### 9.3 Starting state

- Start with 10,000 GD, no plot and no debt.
- Uncle Ravi offers a subsidized first-week lease on a Side Street plot.

---

## 10. Reputation

- Every wallet has a reputation score (0–100) that persists across seasons.
- It goes up with: repaying loans on time, a positive season net worth, consistent pricing (no extreme gouging).
- It goes down with: defaults, liquidations, bankruptcy.
- Effects: lower loan rates, access to Corner plot auctions (minimum reputation 40), and a better manager hiring pool.
- Anti-sybil: new wallets start at 20 and can't bid on Corner plots. Running 10 burner wallets therefore doesn't pay.
- This is a natural place for CipherScore later: reputation as a privacy-preserving credit score inside the game.

---

## 11. Primitive mapping, updated

| Primitive | v1 use | v2 use (added) |
|---|---|---|
| Ephemeral Rollup | Live market | + Persistent neighborhood state for the whole season; spectator market |
| Session keys | Player pricing | + **Manager agents**, each with its own scoped key |
| Cranks | Ticks, events, round end | + Rent, interest accrual, margin calls, liquidations, overnight trading, daily open/close |
| VRF | Market events | + Festival events, customer utility noise, auction tie-breaks, plot release order |
| Private ER | Sealed supply bids | + **Property auctions, private inventory/cost/cash, scouting, sealed buyouts** |
| Ephemeral SPL | (optional) | **Required:** GD becomes a real token in the season, needed for loans, P2P lending, spectator bets |
| Magic Actions | Pot payout | + Season settlement, sponsor payouts, spectator bet settlement |
| Pricing oracle (Pyth Lazer) | (not used) | **New:** real-market demand signals |

**Eight primitives, each one load-bearing, and four of them used in more than one system.**

---

## 12. New accounts

```rust
#[account]
pub struct Season {
    pub id: u64,
    pub neighborhood_id: u64,
    pub started_at: i64,
    pub day: u8,                       // 1..=7
    pub pot: u64,                      // stakes + sponsorship
    pub sponsor_pot: u64,
    pub status: SeasonStatus,
    pub gd_mint: Pubkey,               // ephemeral SPL mint for this season
}

#[account]
pub struct Plot {
    pub season_id: u64,
    pub plot_id: u16,
    pub tier: PlotTier,
    pub street: u8,
    pub position: u8,                  // order along street
    pub owner: Option<Pubkey>,
    pub lessee: Option<Pubkey>,
    pub lease_rate: u64,
    pub last_clearing_price: u64,
    pub business: Option<Pubkey>,
}

#[account]
pub struct Business {
    pub plot: Pubkey,
    pub owner: Pubkey,
    pub kind: BusinessKind,
    pub price_cents: u16,
    pub upgrades: u8,                  // bitflags
    pub manager: Option<Pubkey>,
    pub revenue_today: u64,
    pub revenue_trailing_3d: [u64; 3],
    // Private ER (sealed):
    pub inventory: u32,
    pub unit_cost_cents: u16,
}

#[account]
pub struct PlayerProfile {             // persists across seasons
    pub authority: Pubkey,
    pub reputation: u8,
    pub seasons_played: u16,
    pub lifetime_net_worth: i64,
    pub tutorial_stage: u8,
}

#[account]
pub struct Loan {
    pub borrower: Pubkey,
    pub lender: Pubkey,                // bank PDA or player
    pub principal: u64,
    pub rate_bps_per_day: u16,
    pub accrued: u64,
    pub collateral: Vec<Pubkey>,       // plots/businesses
    pub margin_called_at: Option<i64>,
}

#[account]
pub struct Manager {
    pub business: Pubkey,
    pub session_key: Pubkey,
    pub strategy: ManagerStrategy,
    pub floor_price_cents: u16,
    pub ceiling_price_cents: u16,
    pub daily_wage: u64,
}

#[account]
pub struct ScoutReport {               // Private ER, readable only by buyer
    pub buyer: Pubkey,
    pub target: Pubkey,
    pub day: u8,
    pub encrypted_payload: [u8; 64],
}

#[account]
pub struct BuyoutOffer {               // Private ER
    pub bidder: Pubkey,
    pub target_asset: Pubkey,
    pub encrypted_amount: [u8; 32],
    pub expires_at: i64,
}

#[account]
pub struct SpectatorMarket {
    pub season_id: u64,
    pub day: u8,
    pub kind: MarketKind,
    pub pools: Vec<(Pubkey, u64)>,     // outcome → total staked
    pub resolved: Option<Pubkey>,
}

#[account]
pub struct Sponsor {
    pub season_id: u64,
    pub street: u8,
    pub name: String,                  // max 32
    pub contribution: u64,
    pub sponsor_wallet: Pubkey,
}
```

---

## 13. New instructions

```rust
// Season lifecycle
create_season(neighborhood_id, stake_amount)
join_season(season_id)
sponsor_street(season_id, street, name, amount)
open_day(season_id)                     // crank
close_day(season_id)                    // crank
end_season(season_id)                   // crank → Magic Actions

// Property
open_plot_auction(season_id, plot_ids)  // crank, Private ER
submit_plot_bid(plot_id, bid)           // Private ER
reveal_plot_bids(plot_id)               // crank, Private ER
set_lease(plot_id, rate)
take_lease(plot_id)

// Business
open_business(plot_id, kind)
buy_upgrade(business, upgrade)
set_price(business, price)              // player or manager session key
submit_supply_bid(business, bid)        // Private ER

// Finance
take_loan(amount, collateral)
repay_loan(loan, amount)
accrue_interest(season_id)              // crank
check_margins(season_id)                // crank
liquidate(loan)                         // crank
post_p2p_loan(terms)                    // stretch
accept_p2p_loan(offer)                  // stretch

// Information
buy_scout(target_business)              // Private ER
make_buyout_offer(asset, amount)        // Private ER
accept_buyout(offer)

// Managers
hire_manager(business, strategy, bounds)
fire_manager(business)

// Market signals
apply_market_signals(season_id)         // crank, reads Pyth Lazer

// Spectators
open_spectator_market(day, kind)
place_bet(market, outcome, amount)
settle_spectator_market(market)         // crank
```

---

## 14. Crank schedule, updated

| Crank | Interval | Purpose |
|---|---|---|
| Tick | 1s during market hours | Customer flow |
| Overnight tick | 10s outside market hours | Managers trade at 30% demand |
| Market signals | 5s | Pull Pyth, adjust per-product demand |
| VRF event | 30s during market hours | Events |
| Supply auction | 60s during market hours | Per product type |
| Open day | Daily | Rent, interest, plot auctions, lease payments |
| Margin check | Daily (after open) | Flag positions over 80% LTV |
| Liquidation | Daily (24h after flag) | Seize + auction |
| Close day | Daily | Book revenue, settle spectator markets, leaderboard |
| End season | Day 7 close | Net worth, Magic Actions payout |

---

## 15. UI additions

### 15.1 New screens

| Screen | Purpose |
|---|---|
| Neighborhood map | Isometric view of 4 streets and 20 plots, with ownership colors, foot-traffic heatmap and sponsor banners |
| Portfolio | All your businesses, debts and net worth in one place |
| Business detail | Price, inventory, upgrades, manager settings |
| Bank | Loans, rates, margin status |
| Auction house | Property and supply auctions, sealed-bid UI |
| Intel | Scout reports, buyout offers in and out |
| Spectator mode | Read-only map + bet slip |
| Season leaderboard | Net worth brackets, daily winners |
| Uncle Ravi overlay | Dialogue bubbles, progressive unlocks |

### 15.2 The map is the new hero canvas

- The v1 dot-flow view becomes a neighborhood view.
- Customers stream in from street entrances and split across businesses by utility.
- When SOL pumps, the dots visibly bend toward the electronics shops.
- That's the second hero shot, alongside the sealed-bid reveal.

---

## 16. Demo video, updated (120 seconds)

```
[0:00–0:10]  Cold open: the neighborhood at night, managers trading under streetlights.
             VO: "This economy never sleeps. It runs on MagicBlock."

[0:10–0:25]  Uncle Ravi greets a new player. They lease an alley stall, set a price.
             VO: "Start with nothing. Lease a stall. Sell coffee."

[0:25–0:45]  Day 3: player owns two shops, takes a loan, hires a manager.
             VO: "Expand. Borrow. Hire. Every manager is an agent with its own key."

[0:45–1:05]  THE AUCTION: corner plot goes up. Sealed bids. Glyph scramble. Reveal.
             Player wins. Plot changes color on the map.
             VO: "Property is won in sealed auctions inside Private Ephemeral Rollups."

[1:05–1:20]  Live SOL chart in a corner. SOL pumps. Electronics dots flood.
             VO: "Demand moves with the real market. Read crypto, win in Bazaar."

[1:20–1:35]  A rival misses a margin call. Liquidation crank fires.
             Their shop goes to auction. Player buys it.
             VO: "Debt is real. Cranks enforce it. Fortunes change overnight."

[1:35–1:50]  Season ends. Net worth leaderboard. Pot splits. Phantom popup.
             "MagicBlock Boulevard" sponsor banner visible.
             VO: "Sponsors fund the streets. Players take home real SOL."

[1:50–2:00]  Logo. "Eight primitives. One living economy."
```

---

## 17. Pitch changes

### 17.1 New one-liner

> *"Bazaar is the first onchain tycoon where the money is real: a persistent neighborhood economy with property auctions, enforced debt, agent managers, and demand driven by real crypto markets. All on MagicBlock."*

### 17.2 New pain-point answer (for Jonas)

> *"Tycoon sims prove the demand (Big Ambitions did 150k copies in two weeks), but the money is fake. DeFi has real money but no game. Nothing bridges them, because a living economy needs real-time execution, hidden information, scheduled enforcement and agent automation all at once. That's exactly MagicBlock's stack. Bazaar is the bridge, and sponsored streets mean players can come out ahead on average instead of fighting over each other's stakes."*

### 17.3 Rebuttal to "just another pot game"

> *"There's no pot in the moment-to-moment game. You're running businesses, managing debt, bidding on property and reading the real market. The pot is just how the season settles."*

---

## 18. Build order (dependency-ordered, no dates)

1. **Season + Day + persistent state.** Everything else depends on state surviving between days.
2. **Ephemeral SPL for GD.** Loans, lending and bets need a real token.
3. **Map + Plots + multi-business ownership.**
4. **Property auctions on Private ER.** Reuse the v1 sealed-bid code.
5. **New customer utility model** (traffic tiers, brand, position).
6. **Business types + per-product supply auctions.**
7. **Loans + interest/margin/liquidation cranks.**
8. **Private inventory/cost/cash + scouting.**
9. **Managers with scoped session keys + overnight ticks.**
10. **Pyth Lazer market signals.**
11. **Uncle Ravi onboarding + progressive unlocks.**
12. **Reputation.**
13. **Sponsored streets.**
14. **Spectator prediction market.**
15. **Sealed buyout offers.**
16. **P2P lending, custom manager DSL** (stretch).

If you have to stop early, stopping after step 9 still gives you a persistent tycoon with property, debt and agents, which is already a different category from every past Blitz entry.

---

## 19. Updated risks

| Risk | Mitigation |
|---|---|
| Persistent state across days hits ER account size or delegation lifetime limits | Commit to base layer at each close_day, re-delegate at open_day. Same delegation loop as v1, just repeated daily |
| Too many cranks | Batch daily cranks into one `open_day` and one `close_day` instruction that handle rent, interest, margins and auctions in sequence |
| Private ER state for many businesses gets expensive | Seal only inventory, cost and cash. Keep price and plot ownership public |
| Manager bots dominate human players | Managers get reduced demand capture (85%) compared with an active human |
| Economy balance breaks (runaway leader) | Rent scales with net worth bracket (progressive property tax). Liquidations recycle assets to the market |
| Pyth feed outage | Fall back to VRF-driven demand and show a "market closed" banner |
| Sybil wallets farming starter subsidies | Reputation gating + one subsidized lease per wallet per season |
| Legal (PROGA) | Unchanged: devnet only, legal review before mainnet, geo-fence India. Sponsored, free-entry seasons are the cleaner legal structure |

---

## 20. Decision log additions

### Settled (v2)
- ✅ Seasons of 7 days, each day a 5-minute live session plus an overnight phase
- ✅ Win condition = net worth, not revenue
- ✅ GD becomes an ephemeral SPL token scoped to a season
- ✅ Property is won by sealed auction only (no fixed-price purchases)
- ✅ Managers are agents with scoped session keys
- ✅ Real-market demand via Pyth Lazer, clamped
- ✅ Sponsored streets fund the season pot

### Open (v2)
- [ ] Neighborhood size: 20 plots or 12?
- [ ] Season length: 7 days or 3 days for the demo?
- [ ] Guide character name and art style
- [ ] Which real-market feeds map to which products
- [ ] Spectator market: parimutuel or fixed odds?
- [ ] Whether GD stays season-scoped or becomes redeemable between seasons (roadmap)
