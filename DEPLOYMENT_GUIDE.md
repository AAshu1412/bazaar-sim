# Deploying Bazaar on Solana Devnet & MagicBlock Ephemeral Rollups

This guide walks you step-by-step through:
1. Setting up your wallet and acquiring Devnet SOL
2. Building and deploying the Anchor smart contract to Solana Devnet
3. Delegating the game account to **MagicBlock Ephemeral Rollups (ER)**
4. Connecting the Client & Keeper to your newly deployed program

---

## Step 1: Install Solana CLI & Setup Your Wallet

If you don't have the Solana CLI installed on your machine yet, install it via the official installer:

```bash
# 1. Install Solana CLI suite (v1.18+ or v2.0+)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# 2. Add to your PATH (or restart your terminal)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 3. Verify installation
solana --version
```

### Configure for Devnet & Create a Wallet:

```bash
# Set cluster to Devnet
solana config set --url https://api.devnet.solana.com

# Create a new local keypair (if you don't already have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your public address
solana address

# Airdrop devnet SOL to pay for program deployment (you need ~2 to 3 SOL)
solana airdrop 2
solana airdrop 2
```

*(If the devnet faucet is rate-limited, request SOL at [faucet.solana.com](https://faucet.solana.com)).*

---

## Step 2: Build the Smart Contract

Navigate to the project root:

```bash
cd /home/ashu/projects/ambition/bazaar

# Build the program binary
anchor build
```

This compiles `programs/bazaar/src/lib.rs` and creates the `.so` binary at:
`target/deploy/bazaar.so`

### Match Program ID:

Check the generated program address:
```bash
solana address -k target/deploy/bazaar-keypair.json
```

If the address is different from `394dL2jzTtXjc3tWKTL2cPYyS7rcADAM338FbVumWSSi`, update it in:
1. `programs/bazaar/src/lib.rs` (`declare_id!("YOUR_NEW_PROGRAM_ID");`)
2. `Anchor.toml` (`bazaar = "YOUR_NEW_PROGRAM_ID"`)
3. `client/src/solana/router.ts` (`PROGRAM_ID = new PublicKey("YOUR_NEW_PROGRAM_ID");`)
4. `keeper/src/index.ts` (`const PROGRAM_ID = new PublicKey("YOUR_NEW_PROGRAM_ID");`)

Then rebuild once:
```bash
anchor build
```

---

## Step 3: Deploy to Solana Devnet

Deploy the binary:

```bash
solana program deploy target/deploy/bazaar.so --url https://api.devnet.solana.com
```

You will see:
```text
Program Id: <YOUR_PROGRAM_ID>
Deploy success
```

---

## Step 4: How MagicBlock Ephemeral Rollups (ER) Work

MagicBlock does **not** require deploying a separate contract binary. Instead, it uses **Account Delegation**:

1. **Base Layer (Devnet):** The `Round` and `PlayerStall` accounts are initialized on standard Solana Devnet.
2. **Delegation Instruction:** The authority invokes `delegate_round(round_id)` which delegates the `Round` PDA to the MagicBlock ER delegation validator:
   - **ER RPC:** `https://devnet.magicblock.app`
   - **Private ER (TDX) RPC:** `https://devnet-per.magicblock.app`
3. **Execution on ER:** Once delegated, the ER validator processes transactions (like `set_price` and 1-second `advance_tick`) in **sub-50ms with 0 gas fees**.
4. **End of Round (Magic Actions):** When the round ends at t=300s, `commit_and_settle` commits the final state back to Solana Devnet and undelegates the account.

---

## Step 5: Connecting the Client & Keeper

Both the **client** and **keeper** are already pre-wired to talk directly to:
- Solana Devnet: `https://api.devnet.solana.com`
- MagicBlock ER: `https://devnet.magicblock.app`
- MagicBlock Private ER: `https://devnet-per.magicblock.app`

### 1. In `client/src/solana/router.ts`:
Ensure `PROGRAM_ID` matches your deployed address.

### 2. In `keeper/.env`:
```ini
BASE_RPC_URL=https://api.devnet.solana.com
ER_RPC_URL=https://devnet.magicblock.app
PRIVATE_ER_RPC_URL=https://devnet-per.magicblock.app
KEEPER_WALLET_PATH=~/.config/solana/id.json
ROUND_ID=1
```

### 3. Start the Live System:

```bash
# Terminal 1: Run the autonomous keeper
cd keeper && npm run dev

# Terminal 2: Run the frontend client
cd client && npm run dev
```

Every time you move the price slider in the web app, your **Session Key** signs a transaction sent directly to the Ephemeral Rollup validator, and the live transaction signature appears in the bottom **City Ledger** ticker in real time!
