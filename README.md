# Bazaar ☕ — Plain & Simple Quickstart Guide

Welcome to **Bazaar**! This guide tells you in plain, simple English:
1. What this game is
2. How to start everything up step-by-step
3. How to play and test it
4. How to shut it all down cleanly when you are done
5. Troubleshooting common issues

---

## 1. What is Bazaar?

Bazaar is a 4-player price-war game where you and 3 rivals run coffee stalls on a busy city intersection.
- Every second, customers walk into the street and buy from the cheapest coffee stall that still has inventory.
- You can move your price slider anytime to undercut your opponents — customers will literally pivot mid-walk and come to you!
- Every minute, a secret sealed-bid auction happens for fresh coffee beans.
- At the end of 5 minutes, whoever made the most revenue wins the biggest chunk of the prize pot!

---

## 2. Requirements

Before starting, make sure you have installed on your computer:
- **Node.js** (v18 or v20+ recommended)
- **Rust & Cargo** (for Solana smart contracts)
- A modern web browser (Google Chrome or Brave recommended)

---

## 3. How to Start the Project (Step-by-Step)

Starting the project requires two simple terminal windows:

### Terminal 1: Start the 2.5D Game Screen (Frontend)

```bash
# 1. Go into the client directory
cd /home/ashu/projects/ambition/bazaar/client

# 2. Install dependencies (only needed the first time)
npm install

# 3. Start the game server
npm run dev
```

You will see:
```text
  VITE v5.4.11  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```
Open **`http://localhost:5173/`** in your browser. You will see the city intersection with your stall (golden ring) and customer pedestrians walking along the street!

---

### Terminal 2: Start the Market Engine & AI Bots (Keeper)

*(Optional for solo play, as the browser UI includes simulated bots and auctions, but needed if you want the autonomous background keeper running)*

```bash
# 1. Open a second terminal and go into the keeper directory
cd /home/ashu/projects/ambition/bazaar/keeper

# 2. Install dependencies (only needed the first time)
npm install

# 3. Run the autonomous keeper
npm run dev
```

The keeper will automatically tick customer demand, trigger random weather events every 30 seconds, and run the 3 AI bot competitors (Undercutter, Margin Hawk, and Aggressive Bidder).

---

## 4. How to Play the Game

Once the game is open in your browser (`http://localhost:5173`):

1. **Watch the Customers:** Notice the colorful customer dots walking along the sidewalk towards the coffee stalls.
2. **Change Your Price:** In the top right panel, move the **price slider** or click **+$0.10 / -$0.10**. 
   - Watch the floating price billboard above your stall update instantly.
   - If your price is cheaper than your rivals, walking customers will instantly pivot toward your stall!
   - Every time a customer buys, you will hear a cash register "ching" and see a floating `+$3.00` green text appear.
3. **Sealed-Bid Auction (Supply Refill):**
   - Click the **"Trigger Auction"** button in the top navbar (or wait for the 60-second auto-timer).
   - Enter your secret bid in GD (e.g., 500 GD) and click **"Encrypt & Submit to Private ER"**.
   - Watch the 10-second countdown with encrypted flickering glyphs.
   - At the end of the countdown, the bids reveal one-by-one and a delivery crate drops on the winner's stall (+100 stock).
4. **Instant 1-Click Bot Mode:** Click **"Solo Demo (Fill Bots)"** at the top anytime to instantly fill empty player slots with 3 smart AI bots.
5. **City Ledger Ticker:** Look at the bottom bar to see live transaction signatures streaming by with sub-50ms latency timings!
6. **Sound On/Off:** Click the speaker icon in the top right to mute or unmute sound effects anytime.

---

## 5. How to Stop / Close Everything

When you are finished playing:

1. **Stop the Frontend:** In Terminal 1, press:
   ```text
   Ctrl + C
   ```
2. **Stop the Keeper:** In Terminal 2, press:
   ```text
   Ctrl + C
   ```
3. Close the browser tab. That is it! Nothing stays running in the background.

---

## 6. How to Build & Test the Smart Contract (Optional / For Judges)

If you want to verify the Solana smart contract:

```bash
cd /home/ashu/projects/ambition/bazaar

# Check that the Anchor Rust program compiles:
cargo check

# Run tests:
anchor test
```

---

## 7. Folder Layout Explained Simply

- **`programs/bazaar/src/lib.rs`**: The Solana smart contract (rules, prices, auctions, settlements).
- **`client/`**: The visual 2.5D game that runs in your web browser.
- **`keeper/`**: The background script that moves time forward and runs the 3 AI bots.
- **`tests/`**: Automated tests that prove the whole 4-player game works.
- **`README.md`**: Complete technical breakdown of the 6 MagicBlock primitives for hackathon judges.

Have fun playing Bazaar! ☕
