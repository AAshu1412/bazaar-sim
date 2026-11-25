# Bazaar v2: complete mechanics reference (as the code actually works today)

Status legend used everywhere below:
- **ON-CHAIN**: enforced by the Solana program (devnet, program `GT36pVzQ6NczDeJaL317uGsx1fT1SaKpvSvzUjaPqKTb`).
- **CLIENT-SIM**: computed in the browser only; the chain does not know or check it.
- **UI-ONLY**: a screen/button with local state and no effect on anything else.
- **DESIGNED, NOT BUILT**: described in the README or present as unused program code, but not wired up.

## 1. What the game is
A single-player-feeling tycoon on a 28x28 isometric town. You run one coffee shop (plot #0), set its price, keep it stocked, buy upgrades and win wholesale auctions. Simulated townspeople walk to shops and buy. Money is **GD**, a real SPL token on Solana devnet. 19 other plots belong to simulated rivals or are vacant.

Stack: React + Pixi (client), Anchor 1.2.2 program, MagicBlock **session-keys** program (`KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5`), Pyth price feeds, wallet-adapter (Phantom/Solflare/Backpack).

## 2. Wallet, session, and signing  [ON-CHAIN]
1. User connects a wallet (asks for nothing).
2. "Start session" = **the only wallet approval**. One transaction creates a MagicBlock session token (6 days, scoped to this program) and tops the session key up with 0.04 SOL for fees. Wallet needs about 0.045 devnet SOL and must be set to Devnet.
3. Every later transaction is signed by the session key (stored in localStorage per wallet): create season, join, claim plot, open shop, reprice, restock, upgrade, auction bids, city event requests, customer payments, Pyth crank. No popups.
4. Every game instruction accepts either the wallet itself or a valid session key whose token names the wallet as authority. Strangers are rejected (`Unauthorized`), verified by tests.
5. If the session key's SOL runs low or the session expires, the UI asks for one more approval (revoke + recreate).

## 2b. Ephemeral Rollup  [ON-CHAIN, MagicBlock]
After setup the client delegates the shop: `init_ledger` (once), then `delegate_shop`. Delegating **escrows your GD in the treasury** (token balance shows 0 on devnet), records it in a `ShopLedger` account, and hands the `Business` + ledger accounts to the rollup validator (`https://devnet.magicblock.app`, override with `VITE_ER_URL`; `VITE_ER=off` disables). On the rollup: `set_business_price`, `er_restock`, `er_serve_customers`, `er_buy_upgrade`, `er_bid_auction`, `er_request_event`. Spending is limited to escrow + session net. State auto-commits to devnet every 30 s. **Settle** (header button) calls `undelegate_shop`, then `settle_shop` pays escrow + net into your token account, then delegates again. PlayerState is not delegated; SPL token accounts cannot be delegated by this program, which is why the ledger exists.
Verified locally (rollup validator 2.0.3 on an **Agave 4.2.2** base validator): delegation, all rollup operations, escrow limits, plain commit, and the full Settle cycle (undelegate, pay out, delegate again) with an exact payout. Older base validators (3.0.15, 4.0.0) cannot read the rollup's commit transactions. Local test recipe: run `mb-test-validator` from `@magicblock-labs/ephemeral-validator` with Agave 4.2.2 first on PATH, then `ephemeral-validator --remotes localhost --listen 127.0.0.1:7799`, and start the client with `VITE_RPC_URL=http://127.0.0.1:8899 VITE_ER_URL=http://127.0.0.1:7799`.

## 3. Setup flow the first time you press play  [ON-CHAIN]
`create_season` (PDA per wallet, id 1) -> creates the **GD mint** (2 decimals, authority = season PDA) and a **town treasury** token account holding 10,000,000 GD. `join_season` -> creates your PlayerState + your GD token account and **mints you 10,000 GD**. `initialize_plot(0)` + `claim_plot` -> you pay **3,000 GD** (MainStreet tier plot) to the treasury. `open_business` -> pay **2,000 GD** (CoffeeCart), starting stock **60 units**, price **$2.75**, unit cost about $1.37. You end at ~5,000 GD.

## 4. GD token rules  [ON-CHAIN]
- 1 GD = 100 raw units (cents). Prices are stored in cents (`u16`, max $655.35).
- GD token accounts are owned by the season PDA, so players cannot withdraw or send GD anywhere. It is a play currency.
- All spending goes to the treasury; all customer income comes from the treasury (10M GD, effectively unlimited).
- Costs: plot 800 / 1,500 / 3,000 / 5,000 GD by tier (Alley / Side / Main / Corner). Business 2,000 coffee, 3,500 street food, 8,000 electronics, 2,500 flowers, 4,000 books. Upgrades 1,000 / 1,500 / 3,000 / 5,000.
- Header "Cash Reserve" = your real on-chain GD balance when connected (otherwise a local simulated number). Header "Net Worth" when connected = GD + 5,000 + stock x 1.5 (a rough heuristic, not an on-chain value).

## 5. How customers decide where to buy  [CLIENT-SIM]
Every 1.2 s a townsperson spawns at a random gate and picks ONE shop (winner takes all) via `getBestShopForCustomer()` in `IsometricEngineV3.ts`:
```
utility = -price($) + 0.35 (if shop has Signage) + tierBonus (Corner 0.45, MainStreet 0.25, other 0.10) + random(-0.1..0.1)
```
Only claimed shops with stock >= 1 are candidates. The customer walks (A* over roads/sidewalks) to the shop door, pauses ~0.6 s, buys 1 unit at the shop's price, then walks to a random exit gate.
Active city events change the spawn rate, the price weight or one stall's score (section 8b). NOT in the formula: reputation, Pyth/oracle signals, distance, product type, day/night. The noise is `Math.random`.
Consequence: price differences above ~0.2 decide everything. At $2.75 on the Corner slot your shop wins nearly all customers; around $3.40 you lose most.
A different, unused formula exists in `programs/bazaar/src/utils.rs` (`calculate_customer_utility`, cents-based, includes reputation and a VRF-noise argument). Nothing calls it.

## 6. How a sale becomes money  [ON-CHAIN, but triggered by the client]
When a simulated customer buys from plot #0, the client calls `recordSale()`. Sales are batched (every ~2.5 s, up to 20) into one `serve_customers(count)` transaction. The program moves `price x n` GD from the treasury to your GD account, reduces stock by n, adds to revenue, and counts customers served. If stock is 0 it fails and the UI shows "sold out, restock".
**Trust issue:** the program does not check that customers really came. Only the season authority (your own session key) may call it, but in your own season that is you, so you could "sell" to yourself. Fine for solo play, exploitable for any leaderboard/prize.

## 7. Shop actions (plot #0 inspector panel)
- **Reprice** slider $1.00-$6.00 [ON-CHAIN]: `set_business_price`, debounced 0.6 s. The slider shows your pending price until the chain confirms.
- **Restock +20 (-30 GD)** [ON-CHAIN]: `restock(units)`. Pays `unit_cost x units` to the treasury, stock += units. Cap 200 units (400 with the Storage upgrade).
- **Signage (-1,000 GD)** [ON-CHAIN purchase; effect CLIENT-SIM]: sets upgrade flag 1. In the game it only adds +0.35 to your customer score (and flips `isUpgraded`). The other upgrade flags exist in the program (2 Storage = doubles cap, 4 Second Counter, 8 Brand) but have no UI, and only Storage changes anything on-chain; Second Counter and Brand have no effect anywhere.
- **Hire Manager** [UI-ONLY]: just opens the Director toolbar. The `hire_manager`/`fire_manager` instructions exist but are never called.

## 8. Wholesale auction (Town Hall landmark, or the left-rail Auction button)  [ON-CHAIN, Ephemeral Rollup + MagicBlock VRF]
`er_bid_auction(auction_id, units=100, bid)`: sealed first-price auction. The program reserves your bid in the shop ledger and requests randomness from **MagicBlock VRF** (rollup queue, fee-exempt). The oracle answers with `callback_auction(randomness)`, which only the VRF program can sign for. It draws **three rival bids**, each 60-119% of the lot's wholesale value (units x unit cost, about 137 GD), so they do not exist when you bid. Highest bid wins; ties go to rivals. **Winner pays their own bid and gets +100 stock; a loser's bid is returned.** One pending auction per shop; an unanswered one can be replaced after 150 s, and Settle returns its bid. Each auction id works once. The rivals are random numbers, not real players. Auctions need the rollup: with `VITE_ER=off` or the rollup down they are unavailable.
"Provably fair" covers the rival draw only: it relies on MagicBlock's VRF oracle, and your bid is a normal rollup transaction (public, not encrypted).

## 8b. City events  [VRF draw ON-CHAIN, effect CLIENT-SIM]
Every 60 s (first after 8 s) the client calls `er_request_event`; the VRF callback logs `CityEvent kind=.. target=..` and the client picks it up from the ledger's logs. Each lasts 30 s and shows the banner:
| Event | Effect on the client demand formula |
|---|---|
| Demand surge | twice as many shoppers |
| Rain & slowdown | half as many shoppers |
| Viral stall | one stall (picked by the VRF value) gets +1.2 utility |
| Supply shock | price counts 0.4x (higher prices tolerated) |
| Bargain frenzy | price counts 2.5x |
Nothing about the event is stored on-chain, and the player triggers the request, so it is verifiable randomness, not an enforced game rule.

## 9. Pyth oracle  [partly ON-CHAIN]
- Header shows live SOL/USD and its real 1-hour change from Pyth Hermes (via the Vite dev proxy that injects the API key from `client/.env.local`, `PYTH_API_KEY`).
- Every 5 minutes (when connected) the client posts fresh SOL/BTC price updates and calls `apply_market_signals`, which stores SOL move (bps) and BTC volatility in a `MarketSignals` account. **Nothing reads those values**; they do not affect demand. BTC is best-effort (the feed can be stale).
- The Director "SOL pump" button just overrides the header display with +5.2% and adds a ledger line.

## 10. Map and town (all CLIENT-SIM visuals)
28x28 grid, planned town: two 2-wide avenues crossing at a plaza with a fountain; a ring road; sidewalks; four city blocks (each 3x3 lots of 2x2 tiles with a park in the middle: garden, statue, pond, orchard). 36 lots = 20 playable plots + 6 landmarks + 6 accent shops + 4 parks. Outskirts with farms, workshops, fields and trees. Four gates at the avenue ends where customers spawn/exit.
Plot tiers: 4 Corner (around the plaza; yours is the north-west one), then the 16 other plots ranked by distance to the plaza: 6 MainStreet, 6 SideStreet, 4 Alley. Tier only affects the customer-score bonus. Only plot #0 exists on-chain. Plot types cycle CoffeeCart/StreetFood/Electronics/FlowerStall/Bookshop (id mod 5); unclaimed plots show a fenced "for lease" lot.
Rival shops (19 plots): one rival "human" and several bots with fixed prices ($2.75-$4.20), starting stock 25-60 that never refills (they show SOLD OUT forever once empty). Bots never reprice, restock or pay anything; their numbers are local. Names like "Undercutter Bot" are labels only.
Price tags above shops: coloured by owner type (you green, rival red, bots indigo), with price and a stock bar.

## 11. Landmarks (click them)
| Landmark | What it does today |
|---|---|
| Town Hall | Opens the **VRF auction** (section 8). |
| Bank | **UI-ONLY**: take a loan (2,000/5,000/10,000 GD) or repay; loan sits in local component state, moves no GD, interest rate shown = max(3%, 8% - reputation x 0.05) per day, never charged. The program has `take_loan`/`repay_loan` but they are never called and do not move tokens. |
| Intel Guild | **UI-ONLY**: "scout" a rival (500 GD) shows hardcoded numbers ("wholesale $1.10"); "buyout offer" just flips a sent flag. Program has `buy_scout`/`make_buyout_offer`, never called. |
| Manager Office | Opens the Director toolbar. No real manager mechanic. |
| Spectator Hall | Opens the P&L / Leaderboard board. `open_spectator_market`/`sponsor_street` exist in the program, unused. |
| Uncle Ravi's shop | Opens a 3-step tutorial advice overlay. |

## 12. HUD and other screens
- **Day / night**: a 5:00 countdown loops forever. The "Day 1/7" counter only advances via the Director "fast-forward" button. Night is a visual dark overlay toggled from the Director toolbar; it changes nothing about sales. There is no end of season: `Round Settled` modal (pot split) can never appear because status never becomes Ended.
- **Reputation** (0-100, starts 45 in UI vs 20 on-chain): display only, plus the fake bank rate. See section 5.
- **City ledger**: feed of real transactions (with explorer links) when connected, plus simulation lines when not.
- **Status board** (P&L + leaderboard): P&L uses local counters (customers served today, revenue today) with hardcoded expenses (wholesale $5, rent $4). Leaderboard ranks plots by local daily revenue.
- **Multiplayer lobby** ("World" button): UI-ONLY; shows "2/4 players, bot backfill". No networking.
- **Director toolbar** (demo tools): toggle night, SOL pump display, margin-call ledger message, fast-forward day (+15 reputation, +2,400 cash, +3,500 net worth in the *simulated* numbers only).
- **Guided tour**: 5-step explainer popup.
- **Not connected**: the whole game still runs as a pure local simulation (cash goes up from fake sales).

## 13. In the README / program but NOT implemented
Private ER/TDX sealed bids (bids are public rollup transactions), cranks (day open/close, rent, interest, liquidations), Ephemeral SPL settlement, Magic Actions pot payout, season end and payout, rent/leases between players, loans and liquidation, buyouts, real managers, spectator markets, sponsorship. Program instructions for several exist (`open_day`, `close_day`, `take_loan`, `hire_manager`, `buy_scout`, ...) but the client never calls them.
Also stale: `keeper/` and `tests/` target an older round/auction design and will not work with the current program.

## 14. Known issues and risks
1. `serve_customers` self-farming (section 6): unlimited GD in your own season by setting a high price, selling to yourself and restocking.
2. Demand is client-side and trusted; bots are static. A fair game needs demand, bots and events on-chain.
3. Reputation and oracle signals exist but are not used by demand. Reputation value mismatch (45 vs 20).
4. Net worth, bank, intel and P&L numbers are partly or fully fake.
5. The session key and wallet-less simulation mode use plaintext localStorage.
6. SBPF v3 is not active on devnet/mainnet: always build with `yarn build` (`anchor build --arch v0`).

## 15. Where things live
- Program: `programs/bazaar/src/` (`instructions/{season,property,business,oracle,...}`, `state/`, `gd.rs`, `utils.rs`).
- Client chain logic: `client/src/solana/gameChain.ts` (PDAs, instruction building, session, bootstrap, polling, sales batching, auction, Pyth crank); instruction spec generated into `idlSpec.ts` by `client/scripts/gen-idl-spec.mjs`.
- Map and engine: `client/src/engine/IsometricEngineV3.ts` (rendering, customers, click handling), `townLayout.ts` (street plan, lots, plots, props), `buildingRegistry.ts`.
- Art: generators in `client/art-src/gen/` (`node art-src/gen/build.mjs --png`, `build-interiors.mjs --png`, `build-town.mjs`).
- UI: `client/src/App.tsx` plus `components/` (AuctionModal, PlotInspector, BankModal, IntelModal, WalletChip, ...).
- Run: `cd client && npm run dev` (Phantom on Devnet). Local test validator recipe is in the project history: load the program with `--bpf-program`, clone the session program from mainnet, set `VITE_RPC_URL=http://127.0.0.1:8899`; a dev-only "Dev Wallet" appears under `vite dev`.
