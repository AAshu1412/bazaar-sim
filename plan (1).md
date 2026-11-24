# Bazaar — Build Plan for MagicBlock Solana Blitz v10

**Author:** Sam (@brikym)
**Hackathon:** MagicBlock Solana Blitz v10 (Nov 20–27, 2026)
**Build mode:** Solo, devnet-only, full-week sprint
**Submission:** build.magicblock.app → stage=blitz#submit

---

## 0. Context

### What this is

A 2–4 player live price-war game on MagicBlock. Each player runs a stall in a shared market, sets prices in real time, competes for VRF-driven customer demand, and bids in sealed-bid Private-ER auctions for inventory refills. Rounds are 5 minutes. The pot is the sum of player stakes, split pro-rata by revenue earned.

### Why this shape

- **Entertainment Finance theme fit (v10 brief):** "games are becoming markets, markets are becoming entertainment." Bazaar literally makes market competition the game.
- **Seven MagicBlock primitives, every one load-bearing.** Pull one, the game breaks.
- **Solo-shippable in 7 days** if scope stays locked.
- **Hero-moment-ready:** the sealed-bid reveal is cinematic and only possible because of Private ER in TDX.

### What it is *not*

- Not a full tycoon sim. No life sim, no real estate, no jobs, no loans, no staff, no multi-product. These stay on the roadmap, not in the submission.
- Not real-money mainnet at submission. Devnet stakes only. Real-money plan lives in the roadmap.
- Not an AMM product. GD is an in-round revenue counter, not a persistent tradeable token.

### Non-negotiables

1. Ship a playable public link by end of day 5.
2. Submit at least 24h before deadline with a 90-second demo video and a sharp README.
3. Make 10+ real people play one round before submission.
4. Lock scope by end of day 2. No new features added after that.

---

## 1. Game design

### 1.1 Core loop

1. Players stake devnet SOL to join a round (up to 4 players; backfill with bots if fewer).
2. Each player opens a stall selling the same good. Starting price, starting inventory, starting GD.
3. Round starts. Customers tick in every second, buy from the cheapest in-stock stall.
4. Players reprice continuously. Every 60s, submit a sealed bid for a bulk inventory refill.
5. VRF events fire every ~30s (demand spikes, flash sales, supply shocks).
6. After 5 minutes, the round ends. Pot splits pro-rata by GD earned.

### 1.2 Round structure

| Phase | Duration | Mechanic |
|---|---|---|
| Lobby | Until 4 join or 60s timeout | Players stake, confirm, get a session key |
| Setup | 10s | Players pick opening price (default $3.00) |
| Live market | 300s (5 min) | Customers flow, prices adjust, auctions and events fire |
| Settlement | 5s | Final counters, pot split, Magic Actions commit |
| Results | Until acknowledged | Revenue chart, winner, SOL received |

### 1.3 Player actions

- **Set price** (ER, session key, any time) — single-field update, bounded [0.50, 10.00]
- **Submit sealed bid** (Private ER, during 10s auction window) — bid is lamport amount + units requested
- **View live state** (subscriptions) — opponent prices visible, their bids never visible until reveal

No other actions. No chat. No upgrades. No power-ups.

### 1.4 Simulated customer behavior

**Minimum viable model (ship this):**
- Every 1s tick, a crank mints N customers into the market.
- N = `base_demand × event_multiplier` where `base_demand = 5`, `event_multiplier ∈ [0.5, 3.0]`.
- Each customer independently picks the cheapest in-stock stall. Ties broken by lowest `stall_id`.
- Customer pays `price` in GD to the winning stall. Inventory decrements. Stall's revenue counter increases.
- If no stall has stock, customers leave. No queue.

**Edge cases:**
- All stalls out of stock: customers leave, counters don't move.
- All stalls same price with stock: lowest `stall_id` wins (deterministic).
- Price change mid-tick: next tick uses new price. No partial settlements within a tick.

### 1.5 Sealed-bid auction mechanic

**Flow (every 60s):**
1. **Open (t=0s):** Auction account initialized on Private ER. Target = 100 units of inventory.
2. **Bid window (0–10s):** Each player submits an encrypted bid (lamports offered). Bid stored inside the TDX enclave; nobody (not even the chain state publicly readable) sees opponents' bids.
3. **Reveal (t=10s):** Crank fires `reveal_bids`. All bids decrypted and sorted. Highest bidder wins.
4. **Settlement (t=10s+1 tick):** Winner's GD decrements by bid amount; inventory increments by 100. Losers unchanged.

**Why Private ER specifically:** on a transparent chain or even a public ER, bid transactions are visible pre-reveal. Front-runners read and overbid by $0.01. Private ER keeps the bid value hidden until the reveal instruction runs inside the enclave.

**Design choices:**
- Sealed-bid first-price (simpler to explain than Vickrey for a demo).
- Max one bid per player per auction.
- Minimum bid = 10 GD (prevents zero-bid spam).
- If no bids: inventory unsold, next auction in 60s.

### 1.6 Random events (VRF)

Fired every 30s via VRF-seeded instruction. Event types:

| Event | Weight | Effect |
|---|---|---|
| Demand surge | 30% | N × 2.0 for next 30s |
| Demand drop | 20% | N × 0.5 for next 30s |
| Viral stall | 15% | Random stall gets +100% traffic for 30s |
| Supply shock | 15% | All stalls lose 20% inventory |
| Flash sale | 10% | Random stall's price locked at min for 15s |
| Quiet | 10% | No effect (keeps the event queue honest) |

Event log visible to all players. Each event has a short visual indicator.

### 1.7 Round end and payout

**At t=300s:**
1. Final crank fires `end_round`.
2. Each player's `share = revenue / total_revenue`.
3. Each player's `payout = share × pot_lamports`.
4. `commit_and_settle` CPI to Magic Actions pushes the accounts back to base layer and transfers lamports.
5. Players see results screen with chart, their revenue, their payout, and a tx link.

**Edge case:** if `total_revenue == 0` (nobody sold anything), stakes are refunded 1:1.

---

## 2. Economy model

### 2.1 The pro-rata pot (math)

Let:
- `s_i` = stake from player `i`
- `P` = total pot = `Σ s_i`
- `r_i` = final revenue for player `i`
- `R` = total revenue = `Σ r_i`

Payout for player `i`:
```
payout_i = (r_i / R) × P
```

Conservation: `Σ payout_i = P` (all pot distributed).

### 2.2 Starting constants (initial, tunable on day 5 after playtesting)

| Constant | Value | Rationale |
|---|---|---|
| Entry stake | 0.1 SOL (devnet) | Low enough that losing feels fine |
| Starting GD | 10,000 | Round numbers, easy to reason about |
| Starting inventory | 50 units | ~10s of demand at base rate |
| Opening price (default) | $3.00 | Middle of allowed range |
| Price bounds | $0.50 – $10.00 | Prevents degenerate pricing |
| Base demand | 5 customers/sec | 1,500 customers/round baseline |
| Event frequency | 30s | ~10 events/round |
| Auction frequency | 60s | 5 auctions/round |
| Auction inventory | 100 units | ~20s of demand, worth bidding for |
| Round length | 300s | Short enough to replay, long enough to matter |

### 2.3 GD is a revenue counter, not a currency

GD never leaves the round. It is not minted as an SPL token (ephemeral SPL is used only for auction bid escrow — see §3.10). GD is a `u64` field on each `PlayerStall` account that only increments from customer purchases. At round end, the ratio of GD counters determines pot split.

### 2.4 Why there's no inflation problem

- Starting GD is cosmetic. It gives players a feeling of "working capital" to pay auction bids with.
- Revenue GD grows during the round but is bounded by `max_customers × max_price × duration`.
- Nothing is redeemed as GD. Only the ratio matters. So inflation is irrelevant to solvency.

### 2.5 Rake and sponsor model (post-hackathon, not in v1)

| Model | How it works | Submission scope? |
|---|---|---|
| **Pure pro-rata** | All stakes → pot, pot → players | **Yes. Only this ships.** |
| Rake | 5% to protocol, 95% to pot | Roadmap |
| Sponsor-funded | Sponsor funds pot, entry free | Roadmap; mention in README |

For the demo and submission, use the pure pro-rata model. Mention sponsor-funded rounds as the growth model in the README.

---

## 3. Technical architecture

### 3.1 Programs

**One Anchor program**, `bazaar`:

```rust
// Instructions
initialize_round(round_id, stake_amount, duration)
join_round(round_id)                     // base layer
delegate_round(round_id)                 // base layer → ER
set_price(round_id, new_price)           // ER, session key
advance_tick(round_id)                   // ER, crank-driven
trigger_event(round_id, vrf_result)      // ER, VRF callback
open_auction(round_id, auction_id)       // ER, crank
submit_bid(round_id, auction_id, bid)    // Private ER, session key
reveal_bids(round_id, auction_id)        // Private ER, crank
end_round(round_id)                      // ER, crank
commit_and_settle(round_id)              // ER → base layer via Magic Actions
```

Keep the program single-file for the hackathon. Split later.

### 3.2 Account layout

```rust
#[account]
pub struct Round {
    pub id: u64,
    pub authority: Pubkey,             // program PDA
    pub stake_amount: u64,             // lamports
    pub pot: u64,                      // total staked
    pub started_at: i64,
    pub duration: i64,
    pub status: RoundStatus,           // Lobby, Live, Settled
    pub players: [PlayerStall; 4],
    pub current_auction: Option<AuctionRef>,
    pub last_event_at: i64,
    pub event_multiplier: u16,         // scaled × 100
}

#[account]
pub struct PlayerStall {
    pub authority: Pubkey,             // player wallet
    pub session_key: Pubkey,
    pub price_cents: u16,              // $3.00 = 300
    pub inventory: u32,
    pub revenue: u64,                  // the GD counter
    pub gd_balance: u64,               // available for auction bids
}

#[account]
pub struct Auction {
    pub round_id: u64,
    pub auction_id: u64,
    pub opened_at: i64,
    pub target_inventory: u32,
    pub bids: [Option<Bid>; 4],        // encrypted on Private ER
    pub revealed: bool,
    pub winner: Option<Pubkey>,
}

#[account]
pub struct Bid {
    pub bidder: Pubkey,
    pub encrypted_amount: [u8; 32],    // TDX-sealed
}
```

### 3.3 Delegation lifecycle

1. **Base layer (devnet):** `initialize_round` + `join_round` create `Round` and `PlayerStall` PDAs. Lamports escrowed into the Round PDA.
2. **Base layer:** `delegate_round` transfers ownership of all relevant PDAs to the MagicBlock delegation program. Done once per round.
3. **ER:** All gameplay instructions (`set_price`, `advance_tick`, etc.) target the ER endpoint.
4. **Private ER:** `submit_bid` and `reveal_bids` go to the Private ER endpoint. Account state here is TDX-sealed.
5. **End of round:** `commit_and_settle` CPIs into Magic Actions, which commits final state back to base layer and distributes lamports.
6. **Base layer:** accounts undelegated, Round marked `Settled`.

### 3.4 Dual connection

```typescript
const baseConnection = new Connection("https://api.devnet.solana.com", "confirmed");
const erConnection   = new Connection("https://devnet.magicblock.app", "confirmed");
const perConnection  = new Connection("https://devnet-per.magicblock.app", "confirmed");  // verify URL in docs
```

Transaction routing:
- `initialize_round`, `join_round`, `delegate_round`, `commit_and_settle`: baseConnection
- `set_price`, `advance_tick`, `trigger_event`, `open_auction`, `end_round`: erConnection
- `submit_bid`, `reveal_bids`: perConnection

### 3.5 Session key scope

Session keys are scoped per player to a single round, with a 10-minute TTL (longer than the round so timeouts don't kill play). Allowed instructions:
- `set_price`
- `submit_bid`

Explicitly **not** allowed:
- Any instruction that moves lamports out of the Round PDA
- Any instruction targeting another player's PlayerStall
- `commit_and_settle` (only the crank or any player can call this)

This scoping is the single most important security decision. Get it wrong and players can grief each other.

### 3.6 Crank schedule

| Crank | Interval | Instruction |
|---|---|---|
| Tick | 1s | `advance_tick` |
| Event | 30s | `trigger_event` (requests VRF, callback runs event) |
| Auction open | 60s | `open_auction` |
| Auction reveal | 60s + 10s offset | `reveal_bids` |
| End round | once at t+300s | `end_round` |

**Risk:** MagicBlock cranks may have a minimum interval. If 1s ticks aren't supported, fall back to a lightweight keeper process (a Node script) that signs ticks with a dedicated keeper key. Decide on day 1 after the delegation smoke test.

### 3.7 VRF integration

```typescript
import { requestRandomness, getRandomnessResult } from "@magicblock-labs/vrf-sdk";

// In trigger_event: request randomness with the round + event-counter as seed
const seed = Buffer.concat([
  roundPda.toBuffer(),
  Buffer.from(u64ToBytes(eventCounter))
]);
await requestRandomness({ payer: cranker.publicKey, seed });

// Callback (program instruction) consumes getRandomnessResult(seed),
// maps to an event via the weight table, writes to Round.last_event
```

VRF result → event mapping is a fixed table in the program. Deterministic given the VRF output.

### 3.8 Private ER for auctions

This is the hero primitive. Setup:
- `Auction` PDA delegated to Private ER on open.
- `submit_bid` writes to the encrypted bid slot. Inside TDX, the plain value is sealed; the public account state shows only an opaque blob.
- `reveal_bids` runs inside the enclave, decrypts all bids, sorts, picks winner, updates winner's inventory and GD balance in one atomic transaction.
- Auction PDA committed back and undelegated.

**Devnet caveat:** Private ER availability on devnet needs confirmation on day 1. If unavailable, fallback plan is a public commit-reveal: players commit `hash(bid, salt)` on-chain, reveal bid+salt at reveal time. Less elegant but still demonstrable.

### 3.9 Magic Actions for settlement

At `end_round`, the program computes payouts and emits a Magic Action that:
1. Commits final Round state back to base layer.
2. Transfers `payout_i` lamports from the Round PDA to each player's wallet.
3. Undelegates all round PDAs.

Use the Magic Actions template as the starting point.

### 3.10 Ephemeral SPL (optional in v1)

GD as a counter doesn't need an SPL token. However, for the auction bid escrow, consider minting a Session-Local SPL inside the ER:
- Each player's `gd_balance` is tracked as ephemeral SPL tokens.
- Bidding transfers tokens to an auction escrow.
- Winner's escrow burns to pay the house; losers' escrow returns.

Decision: **skip ephemeral SPL in v1**, use raw `u64` counters. Add ephemeral SPL in week 2 if the roadmap calls for a tradeable GD token.

**If you ship ephemeral SPL in v1:** update the "seven primitives" count honestly. Currently the pitch says seven; without ephemeral SPL it is six. Either ship ephemeral SPL or adjust the pitch wording — do not misrepresent the integration count.

---

## 4. Client architecture

### 4.1 Stack

- **Framework:** React 18 + Vite + TypeScript
- **State:** Zustand (simple, no boilerplate for a 7-day build)
- **Solana:** `@solana/web3.js`, `@solana/wallet-adapter-react`, `@coral-xyz/anchor`
- **MagicBlock:** `@magicblock-labs/ephemeral-rollups-sdk`, `@magicblock-labs/vrf-sdk`
- **Animation:** Framer Motion (for auction reveal, dot flow)
- **Styling:** Tailwind CSS + Radix UI primitives
- **Canvas:** PixiJS for the market view (customers as dots, stalls as sprites)
- **Build/deploy:** Vite → Vercel (static), plus a tiny Node keeper service if cranks can't hit 1s

### 4.2 State subscription pattern

- On join: subscribe to the Round PDA account via `connection.onAccountChange` on the ER endpoint.
- Decode on every change, update Zustand store.
- UI re-renders on store changes.
- Keep sub count low: one for Round, one for current Auction, that's it. Everything else derives.

### 4.3 UI components (minimal)

| Component | Purpose |
|---|---|
| `<Lobby />` | Stake, join, wait for other players |
| `<Market />` | The canvas (stalls, dots, prices overlay) |
| `<PriceControl />` | Slider or +/- buttons for your price |
| `<InventoryBar />` | Your stock, GD balance |
| `<AuctionModal />` | Bid input, countdown, reveal animation |
| `<EventBanner />` | Current event + time remaining |
| `<Scoreboard />` | All players' revenue, ranked |
| `<Results />` | Round end chart, payout breakdown |

### 4.4 Wallet + session key flow

1. User connects Phantom.
2. On "Join round": standard sign-and-send transaction on base layer, stakes 0.1 SOL.
3. Second transaction: user approves creating a session key for Round X, scoped to `set_price` and `submit_bid`, 10-minute TTL.
4. All subsequent gameplay txs signed by the session key, no popups.
5. On round end: session key auto-expires.

### 4.5 Latency handling

- ER is sub-50ms, but network latency from the client is not. Use **optimistic UI**: show the new price immediately, confirm on account subscription.
- Rollback on failure. If a `set_price` fails, snap back and show a toast.
- For the auction submit, show a "submitting..." spinner until the tx confirms on Private ER, since the player can't see their own bid afterward.

---

## 5. UI / UX

### 5.1 Screen inventory

1. **Landing** — one-liner, screenshot GIF, "Play now" button
2. **Connect & Stake** — Phantom connect, stake 0.1 SOL
3. **Lobby** — 4 slots, fill with bots after 30s
4. **Market (live)** — the canvas + overlays
5. **Auction modal** (overlay) — bid, countdown, reveal
6. **Results** — chart, payout, "Play again"

### 5.2 The market canvas (hero visualization)

Full-width canvas, ~800×400. 4 stall sprites (coffee cart style), one per corner. Between them, a grid representing the "street." Customers spawn at grid edges, walk to a stall, disappear on purchase. Each stall has a price tag floating above it.

Color code: your stall is highlighted, others neutral. Customers flow is visible — you can see demand shift when a rival undercuts.

Visually inspired by a mini `Townscaper` meets `Hollywood Mogul`. Simple, clean, readable.

### 5.3 Sealed-bid auction reveal (hero moment)

This is the 10-second shot that goes in the demo video.

**Sequence (10s total):**
- **0.0s:** Auction modal appears. Banner: "Supply shipment arriving — bid for 100 units."
- **0.0–3.0s:** Each player submits a bid. On submit, player sees their own bid value; everyone else sees an animated glyph-scramble (characters flickering rapidly, giving a visual sense of "sealed").
- **3.0–8.0s:** Countdown timer. Scrambled bid blobs pulse.
- **8.0–9.5s:** Reveal animation. Blobs resolve one by one (0.3s each, staggered). Numbers snap into place.
- **9.5–10.0s:** Winner highlighted in gold. Inventory counter on winner's stall increments visibly. Customer dots start flowing toward winner.

Animation stack: Framer Motion for the reveal, custom shader (optional) for the glyph scramble. Keep it to 60fps.

### 5.4 Onboarding

30-second first-time flow:
1. "Welcome to Bazaar. 4 players, 5 minutes, winner takes most."
2. "You run a stall. Set a price. Cheapest in-stock wins the customer."
3. "Every minute, bid in secret for inventory. Higher bid wins."
4. "Good luck." → straight into lobby.

Skip for returning users.

### 5.5 Mobile considerations

For v1: desktop-only, Chrome/Brave recommended. Mobile is a day 8+ thing. Noted in README.

If time at end of week 1: responsive layout for mobile Safari, Phantom mobile wallet support. Nice to have, not blocking.

---

## 6. Day-by-day build plan

### Day 0 (Nov 18–19, pre-kickoff)

**Prep, not build.** Rules don't say you can't prep.

- [ ] Install Rust, Anchor 0.30+, Solana CLI
- [ ] Install `@magicblock-labs/ephemeral-rollups-sdk`, `@magicblock-labs/vrf-sdk`
- [ ] Install MagicBlock Dev Skill (`npx add-skill`)
- [ ] Fork `magicblock-labs/magicblock-engine-examples`
- [ ] Read: docs.magicblock.gg sections on delegation, session keys, cranks, VRF, Private ER
- [ ] Confirm devnet endpoints (base, ER, Private ER) are reachable
- [ ] Reserve project name on build.magicblock.app if required
- [ ] Register for Blitz v10 on Luma
- [ ] Join the Blitz Telegram, introduce yourself

### Day 1 (Fri Nov 20, kickoff livestream)

**Goal: smoke-test the whole stack.** Nothing game-specific.

- [ ] Watch kickoff livestream (2 PM UTC / 7:30 PM IST)
- [ ] Read full v10 brief one more time, note any rule updates
- [ ] Clone an ephemeral-rollups-sdk counter example, run it end-to-end
- [ ] Verify: initialize → delegate → increment (via session key) → commit → undelegate
- [ ] Verify: VRF request/callback works on devnet
- [ ] **Verify: Private ER works on devnet.** This is the day-1 go/no-go.
- [ ] Verify: crank min interval. Can you tick every 1s?
- [ ] Verify: Magic Actions template works
- [ ] By EOD: all 7 primitives individually proven working

**If Private ER is not available on devnet:** switch to commit-reveal fallback immediately. Document in README.

**If cranks can't tick at 1s:** write a 50-line Node keeper service that signs tick instructions. Keep it in `/keeper/`.

### Day 2 (Sat Nov 21)

**Goal: core program compiles with all accounts and instructions, basic 2-player happy path works on ER.**

- [ ] Project scaffold: `anchor init bazaar`, Vite + React client in `/client`
- [ ] Define accounts: `Round`, `PlayerStall`, `Auction`
- [ ] Implement `initialize_round`, `join_round`, `delegate_round`
- [ ] Implement `set_price`, `advance_tick` (just increments a counter for now)
- [ ] Implement `commit_and_settle`
- [ ] Write Anchor tests for the happy path (2 players, 10 ticks)
- [ ] Deploy to devnet
- [ ] EOD check: can two CLI clients join a round and change prices on ER?

**Lock scope here.** Anything not in this plan doesn't ship.

### Day 3 (Sun Nov 22)

**Goal: economy loop works. Customers flow, revenue counters update, rounds end properly.**

- [ ] Implement customer routing in `advance_tick` (cheapest in-stock wins N customers)
- [ ] Implement `end_round`, payout math, Magic Actions CPI
- [ ] Wire up crank for ticks (every 1s) and end_round (at t=300s)
- [ ] Build minimal frontend: lobby, canvas with 4 stalls, price slider, revenue counter
- [ ] No animation yet, no polish. Just make it work.
- [ ] EOD check: 4 CLI/browser clients can play a full 5-min round, pot splits correctly, SOL arrives in wallets

### Day 4 (Mon Nov 23)

**Goal: VRF events, sealed-bid auctions working on Private ER.**

- [ ] Implement `trigger_event` + VRF callback + event mapping table
- [ ] Wire crank for events (every 30s)
- [ ] Implement `open_auction`, `submit_bid`, `reveal_bids` on Private ER
- [ ] Wire cranks for auction open (every 60s) and reveal (10s after open)
- [ ] Minimal UI: event banner, auction modal (no fancy reveal yet)
- [ ] EOD check: a full round has 5 auctions + 10 events, all resolve correctly

**By end of day 4, the game is feature-complete.** Days 5–7 are polish and shipping.

### Day 5 (Tue Nov 24)

**Goal: public playable link, real people play.**

- [ ] Deploy frontend to Vercel
- [ ] Deploy keeper service (if used) to Railway/Fly
- [ ] Write session key UX (wallet integration)
- [ ] Add bots to fill empty slots after 30s lobby timeout
- [ ] Build the dot-flow animation (Framer Motion + Pixi)
- [ ] Post in Blitz Telegram: "Looking for playtesters, drop a wallet address for devnet SOL"
- [ ] Get 10+ unique wallets to play one round
- [ ] EOD check: fresh users can connect and complete a round without help

### Day 6 (Wed Nov 25)

**Goal: hero moment polish, video shot.**

- [ ] Build the sealed-bid reveal animation (glyph scramble, countdown, resolve)
- [ ] Polish: results screen chart, event banner transitions, sound effects (optional)
- [ ] Record demo footage (OBS, 1080p60, 2–3 takes)
- [ ] Draft README with:
  - [ ] One-paragraph description
  - [ ] "Seven primitives, each load-bearing" table
  - [ ] Play link, demo video link
  - [ ] Roadmap (tycoon vision, sponsor model)
  - [ ] Legal note (devnet only)
  - [ ] Credits, Telegram, X handles
- [ ] Edit the demo video to 90s (DaVinci Resolve or CapCut — whichever faster for you)
- [ ] Record voiceover (quiet room, decent mic)

### Day 7 (Thu Nov 26, submit — buffer day 7a before Fri deadline)

**Goal: submit with buffer.**

- [ ] Final playtest round with a fresh wallet
- [ ] Final README pass
- [ ] Submit at build.magicblock.app
- [ ] Twitter teaser thread: GIF of the auction reveal + play link, tag `@magicblock` and `@wizardio`
- [ ] Post in Telegram with the submission link
- [ ] DM 2–3 past Blitz winners for feedback

**Do not add features on day 7. Only fix broken things.**

---

## 7. Demo video (the hero moment)

### 7.1 90-second script

```
[0:00–0:08] COLD OPEN
Black screen. Encrypted bid blob animates, glyphs scrambling.
VO: "Every onchain game with hidden information has the same problem.
     You submit a bid, everyone sees it, you get sniped."

[0:08–0:22] LIVE GAMEPLAY
Cut to the market canvas. Four stalls, customer dots flowing.
Prices adjust visibly. Dots redirect.
VO: "Bazaar is a 4-player live market. You stake SOL, run a stall,
     compete on price. Sub-50ms, no popups, zero fees."

[0:22–0:55] THE AUCTION
Auction modal appears. Four scrambled bid blobs. Countdown.
Reveal cascade. Winner highlighted. Inventory lands. Dots flood.
VO: "Every minute, a sealed-bid auction for inventory.
     Bids are hidden inside Private Ephemeral Rollups —
     TDX-sealed, revealed all at once. This mechanic can't
     exist on any other chain."

[0:55–1:15] ROUND END
Results screen. Revenue chart. Pot splits. Phantom popup with SOL.
VO: "Five minutes, real stakes, real payout. Seven MagicBlock
     primitives, every one load-bearing. Pull one, the game breaks."

[1:15–1:30] CLOSE
Logo: Bazaar. Built on MagicBlock.
Play link, Twitter handle, Blitz v10 chip.
VO: "Play it now. Link in the thread."
```

### 7.2 Recording setup

- **Screen:** OBS, 1080p60, Chrome fullscreen
- **Audio:** USB condenser mic, record in a closet or under a blanket for dead air
- **Lighting:** N/A (screen recording)
- **Edit:** DaVinci Resolve free version. CapCut desktop if faster for you.
- **Music:** none, or something royalty-free and minimal (no copyrighted tracks — submission policy)

### 7.3 Thumbnail

Frame grab of the auction reveal at the moment bids resolve. Gold winner highlight visible. "BAZAAR" text overlay bottom-left. "MagicBlock Blitz v10" chip top-right.

---

## 8. Submission package

### 8.1 README structure

```
# Bazaar
Live multiplayer price-war game on MagicBlock.

## What it is
[One paragraph: the game, the economy, the hero moment]

## Try it
[Play link] [Demo video] [Twitter]

## Why MagicBlock
Seven primitives, each load-bearing.
| Primitive | What it does | Break without it? |
| ... (the table from §2 of this plan) ... |

## Architecture
[One diagram or 3-paragraph description]

## Economy
Pure pro-rata pot. Stakes in, stakes out. No persistent token, no AMM.
[Formula]

## Roadmap
Week 2: sponsor-funded rounds.
Month 1: deeper progression (jobs, loans, business tiers).
Quarter 1: real-world market signals driving in-game demand.

## Submission notes
- Devnet only. See note on India PROGA 2025 in roadmap.
- Submission by @brikym for Blitz v10.

## Credits
Built on MagicBlock ER, Private ER, VRF, Cranks, Session Keys, Magic Actions.
Shoutout to Blueshift, Supersize (Slimecoin), MagicBlock team.
```

### 8.2 Live link

Vercel free tier is fine. Custom domain if you have time: `bazaar.brikym.dev` or similar.

### 8.3 Demo video link

Upload to YouTube unlisted, link from README. Also mirror to Twitter natively for autoplay.

### 8.4 Twitter teaser

Day 6 thread:
1. "What if Big Ambitions was multiplayer, onchain, and you won real SOL? Built for @magicblock Blitz v10. 🧵"
2. GIF of auction reveal
3. "Seven primitives, each load-bearing. Price wars, sealed-bid auctions in Private ER, VRF events."
4. Play link + demo video

Tag `@magicblock`, `@wizardio` (Blitz host), `@SuperteamIndia`.

### 8.5 Telegram outreach

- Day 1: "Starting Bazaar for v10 — solo build, price-war game using the full stack, happy to answer questions."
- Day 3: "Core loop working, 2-player round plays end-to-end on ER."
- Day 5: "Public link up, looking for playtesters, drop your wallet for devnet SOL."
- Day 7: "Submitted. Would love feedback from anyone who plays."

Keep updates light and non-spammy. One per day max.

---

## 9. Pitch narrative

### 9.1 One-liner

> *"A 4-player live price-war game where you compete for a shared customer base and win real SOL. Seven MagicBlock primitives, each load-bearing."*

### 9.2 Elevator pitch

> *"Bazaar takes the business-sim genre (Big Ambitions sold 150k copies in two weeks) and makes the money real. Four players stake SOL, each runs a stall in a shared market, prices adjust live, and a VRF-driven customer flow buys from whoever's cheapest. Every minute there's a sealed-bid auction for inventory — hidden bids in Private Ephemeral Rollups, revealed all at once. Round ends in 5 min, pot splits by revenue earned. The whole thing uses the MagicBlock stack top to bottom because it couldn't work anywhere else."*

### 9.3 Pain point framing (for Jonas and similar questions)

Two framings:
- **For players:** every crypto game right now is reflex (Perps Rider) or RNG (BlitzMine). There's no short-session game where strategic skill — reading opponents, pricing — is what wins. Big Ambitions proves demand for strategic business games; nothing onchain fills it.
- **For MagicBlock:** Private ER doesn't have a consumer-facing poster child yet. Bazaar's sealed-bid auction inside a live game loop is exactly that demo — hidden info inside real-time multiplayer, which has been stuck on ZK or commit-reveal workarounds until now.

### 9.4 "Why MagicBlock" answer

Not "because it's fast." Because this game is **literally impossible** on alternatives:
- Vanilla Solana: 400ms latency breaks "live" repricing. $0.002/tx breaks free-feeling play.
- ZK-based privacy: too slow for 10-second auction windows. Dev complexity kills solo builds.
- L2 sidechains: fragment state, break composability with the rest of Solana DeFi for future features.

Private ER + sub-50ms + zero fees + session keys = the exact substrate this needs.

### 9.5 "Just another pot game" critique rebuttal

Yes structurally, no categorically. The axis of competition is different:
- Perps Rider: reflex vs. market
- Hunch: timing vs. RNG
- Bazaar: **strategy vs. opponent strategy in a shared economy**

Multiplayer economic strategy is rare onchain. The pot is the wrapper, not the game.

---

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Private ER not available on devnet | Medium | High | Fallback: commit-reveal auction, document in README |
| Cranks can't tick at 1s | Medium | Medium | Fallback: Node keeper service, pre-written stub |
| Session key UX confusing for new users | High | Medium | 30-second onboarding flow, "why we need this" copy |
| Scope creep | Very high | Critical | Lock scope day 2, write it in this doc, don't revisit |
| Bot AI too dumb to make game interesting | Medium | High | Simple strategy: undercut lowest price by 5%, bid 100 GD in auctions. Test if it creates tension |
| Nobody plays before judging | Medium | High | Telegram outreach day 5, Superteam India network, X teaser day 6 |
| Demo video looks amateur | Medium | High | Spend 1 full day on video (day 6), re-record if first take is weak |
| PROGA / legal (India) | Low for devnet | Critical if mainnet | Devnet-only for submission. Legal review before any mainnet launch |
| Private ER slower than expected mid-demo | Medium | Medium | Record the demo on a good connection, pre-warm the ER by running a round before |
| Judges never see the Telegram posts | Medium | Low | DM MagicBlock engineers directly day 5 with the link, politely |

---

## 11. Post-hackathon roadmap

### Week 2 (post-submission)

- Add sponsor-funded rounds (same contract, `sponsor_pot` instruction)
- Pitch MagicBlock, Supersize, and 2–3 Solana protocols for sponsorship
- Add ephemeral SPL for GD (tradeable within rounds)
- Public leaderboard across all rounds

### Month 1

- Progression: starting bankroll earned through jobs (mini-games)
- Loans with interest, defaults, consequences
- Multi-product stalls
- Reputation gating (anti-sybil via CipherScore-style attestations)

### Quarter 1

- The full Big Ambitions-scoped vision: multi-neighborhood city, real estate, staff
- Real-world market signals (Pyth Lazer) influencing in-game demand — closes the "markets become entertainment" loop
- Mainnet launch with legal review, geo-fenced from India
- B2B: sponsored rounds as a product for protocols seeking user acquisition

### Vision

The thing I pitched to Jonas: MagicBlock as the bridge from entertainment (tycoon sims) to real finance (tradeable game assets, real-stakes competition, live-market mechanics). Bazaar is step 1.

---

## 12. Decision log

### Settled

- ✅ Scope: 4-player, 1 neighborhood, 1 product, 5-min rounds
- ✅ Economy: pure pro-rata pot, GD as counter not currency
- ✅ No AMM in v1, no persistent GD token
- ✅ Devnet only for submission
- ✅ Web only for submission, mobile is week 2+
- ✅ Hero moment: sealed-bid auction reveal
- ✅ Pitch framing: "entertainment → real finance bridge" + "seven primitives load-bearing"
- ✅ Name: Bazaar (working title, open to change if conflict emerges)

### Open

- [ ] Final name (Bazaar, or alternative?) — revisit after day 2
- [ ] Private ER devnet availability — resolve day 1
- [ ] Crank min interval — resolve day 1
- [ ] Ephemeral SPL in v1 or not — resolve day 2
- [ ] Round length 5 min vs 3 min — decide after day 5 playtest
- [ ] Demo stall product (coffee, something else) — low priority, decide day 6

---

## 13. Resources

### Docs
- MagicBlock docs: https://docs.magicblock.gg
- ER quickstart: /pages/ephemeral-rollups-ers/how-to-guide/quickstart
- Session keys: /pages/tools/session-keys/introduction
- Cranks: /pages/tools/crank/introduction
- VRF: /pages/tools/vrf (verify path)
- Private ER: /pages/private-ephemeral-rollups-pers/how-to-guide/quickstart
- Magic Actions: /pages/ephemeral-rollups-ers/magic-actions/overview
- Ephemeral SPL: /pages/ephemeral-spl-token/overview

### Repos
- Examples: https://github.com/magicblock-labs/magicblock-engine-examples
- SDK: https://github.com/magicblock-labs/ephemeral-rollups-sdk
- VRF SDK: https://github.com/magicblock-labs/vrf-sdk

### Dev skill
- `npx add-skill https://github.com/magicblock-labs/magicblock-dev-skill`
- Activates in Claude Code when asked about MagicBlock

### Blitz v10
- Luma: https://luma.com/hedv5sgh
- Submit: https://build.magicblock.app/?stage=blitz#submit
- Builder directory: https://build.magicblock.app/builders
- Co-working: https://play.workadventu.re/@/magicblock/magicblock-office/startup

### Past winners (reference)
- CapturGO (v6 1st): GPS rewards with Private ER
- Perps Rider (v6 2nd): perps trading as racing
- Hunch (v6 3rd): stake-and-climb, VRF
- VeilMarket (v6 Wizardio's Choice): private prediction markets, uses all 3 privacy primitives
- BlitzMine: real-time mining, VRF
- Tenor: private FX RFQ, Private ER
- Slimecoin (Supersize): real-time arena, ER

---

## Appendix A: Daily checklist template

Copy this for each day:

```
## Day N — [Date]

### Primary goal
[One sentence]

### Must-finish
- [ ] Item
- [ ] Item

### Nice-to-have
- [ ] Item

### Blocked on
- [ ]

### Decisions made today
-

### Log
HH:MM — note
```

## Appendix B: One-liner library

For different audiences:

- **Hackathon judge (short):** "4-player live price-war game. Seven MagicBlock primitives, each load-bearing."
- **Crypto dev (Twitter):** "A real-time multiplayer market on MagicBlock. Sealed-bid auctions in Private ER. Pure pro-rata pot."
- **Non-crypto:** "You run a shop against three other players. Cheapest shop wins the customer. Round ends in 5 min. Winner takes most."
- **Founder (VC-adjacent):** "Entertainment Finance proof of concept. Big Ambitions-style strategic game where the money is real, built on the one stack that makes it technically possible."
