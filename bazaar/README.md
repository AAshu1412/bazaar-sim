# 🏛️ Bazaar v2: The First Onchain Tycoon
> *"A persistent 2.5D isometric neighborhood economy running on 8 load-bearing MagicBlock primitives."*
> **Built for MagicBlock Solana Blitz v10 Hackathon**

---

## 🌟 Overview

**Bazaar v2** is a live multiplayer economic simulation running on Solana and MagicBlock Ephemeral Rollups. Players manage commercial stalls across a 28×28 isometric neighborhood, compete in sealed-bid wholesale auctions on TDX Private ERs, borrow against property from an automated NPC bank, reprice stalls sub-50ms with session keys, hire autonomous bot managers, and react to live Pyth Lazer oracle price shocks.

---

## 🏗️ 8 Load-Bearing MagicBlock Primitives

1. **Ephemeral Rollups (ER):** Sub-50ms 1-second customer transaction ticks and session key repricing with zero base-layer congestion.
2. **Private ER (PER):** TDX enclave encryption for sealed-bid supply auctions and secret M&A buyout bids to prevent frontrunning and mempool sniping.
3. **Session Keys:** Gasless, popup-free instant repricing and inventory management delegated to temporary burner keys with strict instruction-level scope.
4. **Cranks:** Autonomous recurring execution for rent collection, interest accrual, Dutch auction liquidations, and day/night transitions.
5. **VRF (Verifiable Random Function):** Verifiably random weather and market events (Demand Surge, Supply Shock, Viral Stall).
6. **Ephemeral SPL:** In-round, high-velocity GD token circulation that settles atomically to base Solana upon season closing bell.
7. **Magic Actions:** Seamless composability between external Solana DeFi and internal market mechanics.
8. **Pyth Lazer Oracles:** Real-time SOL/USD and BTC feeds driving dynamic demand for high-tier goods (Arcane & Clockwork tech).

---

## 🚀 Quick Start Guide (Plain & Simple)

### Prerequisites
- **Node.js:** v18 or v20+ (`node -v`)
- **Rust & Cargo:** 1.79+ (`cargo -V`)
- **Anchor CLI:** 0.30+ / 0.31+ (`anchor -V`)
- **Solana CLI:** 1.18+ (`solana -V`)

---

### Step 1: Clone & Install Dependencies

```bash
# Navigate to the repository
cd /home/ashu/projects/ambition/bazaar

# 1. Install Client Dependencies
cd client
npm install

# 2. Install Keeper Dependencies
cd ../keeper
npm install
```

---

### Step 2: Start the Game Frontend (Diorama & HUD)

```bash
cd /home/ashu/projects/ambition/bazaar/client
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

- **Diorama View:** 28×28 isometric grid featuring real pixel-art buildings, cobblestone roads, sidewalks, and active pedestrians.
- **Controls:**
  - **Left Click + Drag / Touch:** Pan camera across the district.
  - **Scroll Wheel / Pinch:** Smooth zoom in/out (0.35x to 2.4x).
  - **WASD / Arrow Keys:** Keyboard panning.
  - **Click any Plot:** Opens the slide-over **Plot Inspector** to adjust price via Session Key or inspect owners.
  - **Click Landmarks:**
    - 🏦 **Bank Vault:** Opens the First District Bank to borrow or repay loans.
    - 🏛️ **Town Hall:** Rings the bell and accesses sealed-bid wholesale auctions.
    - 🗺️ **Intel Guild:** Scout competitor reserves and submit confidential buyout bids.
    - 📜 **Uncle Ravi:** Open the interactive gameplay tutorial.
    - ⚙️ **Director Toolbar:** Test day/night cycles, Pyth SOL pump, and margin call liquidations.

---

### Step 3: Start the Autonomous Keeper (Simulation & Cranks)

In a separate terminal:
```bash
cd /home/ashu/projects/ambition/bazaar/keeper
npm run dev
```
The keeper autonomously simulates:
- Sub-50ms customer generation and A* street routing.
- Ephemeral Rollup transaction processing.
- Automated competitor bots (Undercutter, Price Gouger, Value Balanced).
- Daily upkeep cranks (rent collection and interest accrual).

---

### Step 4: How to Stop Everything

To stop the game at any time:
1. In the terminal running `client`, press `Ctrl + C`.
2. In the terminal running `keeper`, press `Ctrl + C`.

---

## 🧪 Smart Contract Build & Devnet Deployment

The smart contract is written in modular Anchor/Rust located in `programs/bazaar/`.

### Check & Build
```bash
cd /home/ashu/projects/ambition/bazaar/programs/bazaar
cargo check
```

### Deploy to Solana Devnet
```bash
# 1. Ensure you have devnet SOL
solana airdrop 2 --url devnet

# 2. Build the Anchor program
anchor build

# 3. Deploy to Solana Devnet
anchor deploy --provider.cluster devnet

# 4. Delegate Season and Plot PDAs to MagicBlock Ephemeral Rollup:
# MagicBlock Devnet Rollup Router: https://devnet.magicblock.app
```

---

## 🎨 Asset & Architecture Guide

- `client/public/assets/buildings/`: 67 authentic 2.5D isometric pixel art PNG sprites.
- `client/src/engine/IsometricEngineV3.ts`: Viewport-enabled PixiJS v8 engine with road-only A* pathfinding, depth sorting, and day/night lighting.
- `client/src/engine/buildingRegistry.ts`: Type-safe building mapping for 5 business categories, 6 landmarks, and perimeter architecture.
- `client/src/components/PlotInspector.tsx`: Gilded Merchant Guild style slide-over card for stall management.
- `client/src/components/CityLedger.tsx`: Live transaction ticker showing sub-50ms ER/PER latency and verifiable signatures.
- `programs/bazaar/src/`: Modular smart contract architecture partitioned into `state/` and `instructions/`.

---

## 🏆 Hackathon Verifications

- ✅ **Smart Contract:** Clean compile with zero errors on Anchor/Rust (`cargo check`).
- ✅ **Frontend:** Zero TypeScript errors and production bundle built cleanly with Vite.
- ✅ **Keeper:** Standalone TypeScript simulation running without missing modules.
- ✅ **Aesthetic:** 100% pixel-art PNG diorama with zero procedural placeholder boxes.
