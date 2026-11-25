import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Bazaar } from "../target/types/bazaar";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("bazaar", () => {
  // ───────────────────────────────────────────────────────────
  // Setup
  // ───────────────────────────────────────────────────────────
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.bazaar as Program<Bazaar>;

  const PROGRAM_ID = new PublicKey(
    "GT36pVzQ6NczDeJaL317uGsx1fT1SaKpvSvzUjaPqKTb"
  );

  // Round parameters
  const roundId = new anchor.BN(1);
  const stakeAmount = new anchor.BN(100_000_000); // 0.1 SOL
  const duration = new anchor.BN(300); // 300 seconds

  // Auction parameters
  const auctionId = new anchor.BN(1);

  // Players
  const creator = provider.wallet;
  const player1 = Keypair.generate();

  // ───────────────────────────────────────────────────────────
  // PDA helpers
  // ───────────────────────────────────────────────────────────
  function getRoundPDA(id: anchor.BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("round"), Buffer.from(id.toArray("le", 8))],
      PROGRAM_ID
    );
  }

  function getAuctionPDA(
    rId: anchor.BN,
    aId: anchor.BN
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("auction"),
        Buffer.from(rId.toArray("le", 8)),
        Buffer.from(aId.toArray("le", 8)),
      ],
      PROGRAM_ID
    );
  }

  const [roundPDA] = getRoundPDA(roundId);
  const [auctionPDA] = getAuctionPDA(roundId, auctionId);

  // Constants mirrored from the program
  const STARTING_GD = 10_000;
  const STARTING_INVENTORY = 50;
  const DEFAULT_PRICE_CENTS = 300;
  const BASE_DEMAND = 5;
  const AUCTION_INVENTORY = 100;

  // ───────────────────────────────────────────────────────────
  // Airdrop helper
  // ───────────────────────────────────────────────────────────
  async function airdrop(pubkey: PublicKey, lamports: number) {
    const sig = await provider.connection.requestAirdrop(pubkey, lamports);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  }

  // ───────────────────────────────────────────────────────────
  // Fund accounts before tests
  // ───────────────────────────────────────────────────────────
  before(async () => {
    await airdrop(player1.publicKey, 2_000_000_000); // 2 SOL
  });

  // ═══════════════════════════════════════════════════════════
  // 1. Initialize Round
  // ═══════════════════════════════════════════════════════════
  it("1. Initialize Round — creates round with ID 1, stake 0.1 SOL, 300s duration", async () => {
    const tx = await program.methods
      .initializeRound(roundId, stakeAmount, duration)
      .accounts({
        round: roundPDA,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  initializeRound tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);

    expect(roundAccount.id.toNumber()).to.equal(1);
    expect(roundAccount.stakeAmount.toNumber()).to.equal(100_000_000);
    expect(roundAccount.duration.toNumber()).to.equal(300);
    expect(roundAccount.pot.toNumber()).to.equal(0);
    expect(roundAccount.playerCount).to.equal(0);
    expect(roundAccount.tick).to.equal(0);
    expect(roundAccount.auctionActive).to.equal(false);
    expect(roundAccount.currentAuctionId.toNumber()).to.equal(0);
    expect(roundAccount.eventMultiplier).to.equal(100); // 1.0x
    expect(roundAccount.authority.toBase58()).to.equal(
      creator.publicKey.toBase58()
    );
    // Status should be Lobby (the enum variant)
    expect(JSON.stringify(roundAccount.status)).to.include("lobby");

    console.log("  ✓ Round initialized in Lobby status");
  });

  // ═══════════════════════════════════════════════════════════
  // 2. Join Round — 1 real player joins
  // ═══════════════════════════════════════════════════════════
  it("2. Join Round — real player joins and pays stake", async () => {
    const balanceBefore = await provider.connection.getBalance(
      player1.publicKey
    );

    const tx = await program.methods
      .joinRound(roundId, false) // is_bot = false
      .accounts({
        round: roundPDA,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log("  joinRound tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);
    expect(roundAccount.playerCount).to.equal(1);
    expect(roundAccount.pot.toNumber()).to.equal(100_000_000); // 0.1 SOL

    // Verify player stall at index 0
    const stall = roundAccount.players[0];
    expect(stall.authority.toBase58()).to.equal(player1.publicKey.toBase58());
    expect(stall.isBot).to.equal(false);
    expect(stall.isActive).to.equal(true);
    expect(stall.priceCents).to.equal(DEFAULT_PRICE_CENTS);
    expect(stall.inventory).to.equal(STARTING_INVENTORY);
    expect(stall.revenue.toNumber()).to.equal(0);
    expect(stall.gdBalance.toNumber()).to.equal(STARTING_GD);

    // Verify stake was transferred
    const balanceAfter = await provider.connection.getBalance(
      player1.publicKey
    );
    expect(balanceBefore - balanceAfter).to.be.greaterThan(99_000_000); // stake + fees

    console.log("  ✓ Player joined at slot 0, stake deducted");
  });

  // ═══════════════════════════════════════════════════════════
  // 3. Start with Bots — 3 bots fill remaining slots, round goes Live
  // ═══════════════════════════════════════════════════════════
  it("3. Start with Bots — 3 bots join and round moves to Live", async () => {
    const tx = await program.methods
      .startWithBots(roundId, 3) // 3 bots
      .accounts({
        round: roundPDA,
        signer: creator.publicKey,
      })
      .rpc();

    console.log("  startWithBots tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);
    expect(roundAccount.playerCount).to.equal(4);
    expect(JSON.stringify(roundAccount.status)).to.include("live");
    expect(roundAccount.startedAt.toNumber()).to.be.greaterThan(0);

    // Verify bot stalls (slots 1-3)
    for (let i = 1; i <= 3; i++) {
      const botStall = roundAccount.players[i];
      expect(botStall.isBot).to.equal(true);
      expect(botStall.isActive).to.equal(true);
      expect(botStall.inventory).to.equal(STARTING_INVENTORY);
      expect(botStall.gdBalance.toNumber()).to.equal(STARTING_GD);
      expect(botStall.priceCents).to.equal(DEFAULT_PRICE_CENTS);
      expect(botStall.authority.toBase58()).to.equal(
        PublicKey.default.toBase58()
      );
    }

    console.log("  ✓ 3 bots joined at slots 1-3, round is LIVE");
  });

  // ═══════════════════════════════════════════════════════════
  // 4. Set Price — Player sets price to $2.50 (250 cents)
  // ═══════════════════════════════════════════════════════════
  it("4. Set Price — player 0 sets price to 250 cents ($2.50)", async () => {
    const playerIndex = 0;
    const newPriceCents = 250;

    const tx = await program.methods
      .setPrice(roundId, playerIndex, newPriceCents)
      .accounts({
        round: roundPDA,
        signer: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    console.log("  setPrice tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);
    expect(roundAccount.players[0].priceCents).to.equal(250);

    // Bots should still be at default price
    expect(roundAccount.players[1].priceCents).to.equal(DEFAULT_PRICE_CENTS);
    expect(roundAccount.players[2].priceCents).to.equal(DEFAULT_PRICE_CENTS);
    expect(roundAccount.players[3].priceCents).to.equal(DEFAULT_PRICE_CENTS);

    console.log("  ✓ Player 0 price set to 250 cents");
  });

  // ═══════════════════════════════════════════════════════════
  // 5. Advance Ticks — Run 5 ticks, verify revenue & inventory
  // ═══════════════════════════════════════════════════════════
  it("5. Advance Ticks — run 5 ticks, verify revenue and inventory changes", async () => {
    const roundBefore = await program.account.round.fetch(roundPDA);
    const inventoryBefore = roundBefore.players[0].inventory;
    const revenueBefore = roundBefore.players[0].revenue.toNumber();

    for (let i = 0; i < 5; i++) {
      await program.methods
        .advanceTick(roundId)
        .accounts({
          round: roundPDA,
          signer: creator.publicKey,
        })
        .rpc();
    }

    const roundAfter = await program.account.round.fetch(roundPDA);
    expect(roundAfter.tick).to.equal(5);

    // Player 0 has the cheapest price (250 vs 300 for bots)
    // BASE_DEMAND = 5, all 5 customers should go to cheapest stall each tick
    // After 5 ticks: 25 customers total → all to player 0 (cheapest)
    const player0 = roundAfter.players[0];
    const totalSold = inventoryBefore - player0.inventory;

    expect(totalSold).to.equal(25); // 5 customers × 5 ticks
    expect(player0.inventory).to.equal(STARTING_INVENTORY - 25); // 50 - 25 = 25
    expect(player0.revenue.toNumber()).to.equal(revenueBefore + 25 * 250); // 25 sales × 250 cents

    // Bots shouldn't have sold anything (higher price)
    for (let i = 1; i <= 3; i++) {
      expect(roundAfter.players[i].inventory).to.equal(STARTING_INVENTORY);
      expect(roundAfter.players[i].revenue.toNumber()).to.equal(0);
    }

    console.log(
      `  ✓ 5 ticks processed — player 0 sold ${totalSold} units, revenue: ${player0.revenue.toNumber()} GD`
    );
  });

  // ═══════════════════════════════════════════════════════════
  // 6. Open Auction — open auction #1
  // ═══════════════════════════════════════════════════════════
  it("6. Open Auction — open auction #1 for 100 inventory units", async () => {
    const tx = await program.methods
      .openAuction(roundId, auctionId)
      .accounts({
        round: roundPDA,
        auction: auctionPDA,
        signer: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  openAuction tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);
    expect(roundAccount.auctionActive).to.equal(true);
    expect(roundAccount.currentAuctionId.toNumber()).to.equal(1);

    const auctionAccount = await program.account.auction.fetch(auctionPDA);
    expect(auctionAccount.roundId.toNumber()).to.equal(1);
    expect(auctionAccount.auctionId.toNumber()).to.equal(1);
    expect(auctionAccount.targetInventory).to.equal(AUCTION_INVENTORY);
    expect(auctionAccount.revealed).to.equal(false);
    expect(auctionAccount.bidCount).to.equal(0);
    expect(auctionAccount.openedAt.toNumber()).to.be.greaterThan(0);

    console.log("  ✓ Auction #1 opened, 100 units available");
  });

  // ═══════════════════════════════════════════════════════════
  // 7. Submit Bid — Player bids 500 GD
  // ═══════════════════════════════════════════════════════════
  it("7. Submit Bid — player 0 bids 500 GD on auction #1", async () => {
    const playerIndex = 0;
    const bidAmount = new anchor.BN(500);

    const roundBefore = await program.account.round.fetch(roundPDA);
    const gdBefore = roundBefore.players[0].gdBalance.toNumber();

    const tx = await program.methods
      .submitBid(roundId, auctionId, playerIndex, bidAmount)
      .accounts({
        round: roundPDA,
        auction: auctionPDA,
        signer: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    console.log("  submitBid tx:", tx);

    const auctionAccount = await program.account.auction.fetch(auctionPDA);
    expect(auctionAccount.bidCount).to.equal(1);
    expect(auctionAccount.bids[0].hasBid).to.equal(true);
    expect(auctionAccount.bids[0].amount.toNumber()).to.equal(500);
    expect(auctionAccount.bids[0].bidder.toBase58()).to.equal(
      player1.publicKey.toBase58()
    );

    console.log("  ✓ Player 0 bid 500 GD on auction #1");
  });

  // ═══════════════════════════════════════════════════════════
  // 8. Reveal Bids — reveal and verify winner gets +100 inventory
  // ═══════════════════════════════════════════════════════════
  it("8. Reveal Bids — reveal auction, winner gets +100 inventory", async () => {
    // We need to wait for the auction window to close (10 seconds).
    // In localnet with warp, we can advance clock by sending transactions.
    // The reveal instruction requires clock >= opened_at + 10.
    // We'll use a small sleep to let local validator time pass.
    await sleep(11_000);

    const roundBefore = await program.account.round.fetch(roundPDA);
    const inventoryBefore = roundBefore.players[0].inventory;
    const gdBefore = roundBefore.players[0].gdBalance.toNumber();

    const tx = await program.methods
      .revealBids(roundId, auctionId)
      .accounts({
        round: roundPDA,
        auction: auctionPDA,
        signer: creator.publicKey,
      })
      .rpc();

    console.log("  revealBids tx:", tx);

    const auctionAccount = await program.account.auction.fetch(auctionPDA);
    expect(auctionAccount.revealed).to.equal(true);
    expect(auctionAccount.winner.toBase58()).to.equal(
      player1.publicKey.toBase58()
    );

    const roundAfter = await program.account.round.fetch(roundPDA);
    // Winner gets +100 inventory
    expect(roundAfter.players[0].inventory).to.equal(
      inventoryBefore + AUCTION_INVENTORY
    );
    // 500 GD deducted for the winning bid
    expect(roundAfter.players[0].gdBalance.toNumber()).to.equal(
      gdBefore - 500
    );
    // Auction is no longer active on the round
    expect(roundAfter.auctionActive).to.equal(false);

    console.log(
      `  ✓ Auction revealed — player 0 wins, inventory: ${roundAfter.players[0].inventory}, GD spent: 500`
    );
  });

  // ═══════════════════════════════════════════════════════════
  // 9. Trigger Event — fire a VRF event with a known seed
  // ═══════════════════════════════════════════════════════════
  it("9. Trigger Event — fire a Demand Surge event (VRF byte 0 = 50)", async () => {
    // Construct a VRF result where byte[0] = 50 → DemandSurge (0-76 range)
    // and byte[1] = 0 → target stall 0
    const vrfResult = new Array(32).fill(0);
    vrfResult[0] = 50; // Maps to DemandSurge
    vrfResult[1] = 0; // Target stall index (0 % 4 = 0)

    const tx = await program.methods
      .triggerEvent(roundId, vrfResult)
      .accounts({
        round: roundPDA,
        signer: creator.publicKey,
      })
      .rpc();

    console.log("  triggerEvent tx:", tx);

    const roundAccount = await program.account.round.fetch(roundPDA);
    // DemandSurge sets multiplier to 200 (2.0x)
    expect(roundAccount.eventMultiplier).to.equal(200);
    expect(roundAccount.eventMultiplierExpiresAt.toNumber()).to.be.greaterThan(
      0
    );
    expect(JSON.stringify(roundAccount.lastEventType)).to.include(
      "demandSurge"
    );
    expect(roundAccount.lastEventAt.toNumber()).to.be.greaterThan(0);

    console.log(
      "  ✓ Demand Surge triggered — multiplier set to 2.0x (200)"
    );
  });

  // ═══════════════════════════════════════════════════════════
  // 10. End Round — advance enough, then call end_round
  // ═══════════════════════════════════════════════════════════
  it("10. End Round — wait for duration to elapse, then end the round", async () => {
    // The round started ~15s ago (from test execution). Duration is 300s.
    // On localnet we need to actually wait or warp the clock.
    // For testing purposes, we'll initialize a NEW round with a very short
    // duration and test end_round with it, OR we can re-use the existing
    // round by sleeping if the test timeout allows it.
    //
    // Strategy: Create a second round with 2s duration to test end_round
    // but we still want to end round 1. We'll use a workaround:
    // the ts-mocha timeout is 1000000ms so we can wait if needed.
    //
    // However, sleeping 300s is impractical. Instead, let's keep cranking
    // advance_tick until the round time expires. The test suite has a
    // generous timeout.
    //
    // On solana-test-validator, the clock advances with each slot (~400ms).
    // We'll wait for the duration to pass.

    // Check how much time has passed
    const roundAccount = await program.account.round.fetch(roundPDA);
    const startedAt = roundAccount.startedAt.toNumber();
    const durationSecs = roundAccount.duration.toNumber();

    // We need to wait until clock >= startedAt + duration
    // On localnet, we can advance slots to advance the clock.
    // Let's poll and wait.

    let elapsed = 0;
    let attempts = 0;
    const maxAttempts = 400; // Safety limit

    while (elapsed < durationSecs && attempts < maxAttempts) {
      // Advance a tick (this also moves the clock forward by a slot)
      try {
        await program.methods
          .advanceTick(roundId)
          .accounts({
            round: roundPDA,
            signer: creator.publicKey,
          })
          .rpc();
      } catch {
        // Tick might fail if round time expired — that's fine
      }

      // Small delay to let validator advance
      await sleep(1000);
      attempts++;

      // Check clock
      const slot = await provider.connection.getSlot();
      const blockTime = await provider.connection.getBlockTime(slot);
      if (blockTime) {
        elapsed = blockTime - startedAt;
      }
    }

    // Now call end_round
    const tx = await program.methods
      .endRound(roundId)
      .accounts({
        round: roundPDA,
        signer: creator.publicKey,
      })
      .rpc();

    console.log("  endRound tx:", tx);

    const roundAfter = await program.account.round.fetch(roundPDA);
    expect(JSON.stringify(roundAfter.status)).to.include("ended");

    console.log(
      `  ✓ Round ended after ${roundAfter.tick} ticks`
    );
  });

  // ═══════════════════════════════════════════════════════════
  // 11. Settle — call commit_and_settle, verify pro-rata payouts
  // ═══════════════════════════════════════════════════════════
  it("11. Settle — commit_and_settle distributes pot pro-rata by revenue", async () => {
    const roundBefore = await program.account.round.fetch(roundPDA);
    const pot = roundBefore.pot.toNumber();

    // Compute expected total revenue
    let totalRevenue = 0;
    for (let i = 0; i < 4; i++) {
      if (roundBefore.players[i].isActive) {
        totalRevenue += roundBefore.players[i].revenue.toNumber();
      }
    }

    console.log(`  Pot: ${pot} lamports`);
    console.log(`  Total revenue: ${totalRevenue} GD-cents`);
    for (let i = 0; i < 4; i++) {
      console.log(
        `  Player ${i}: revenue=${roundBefore.players[i].revenue.toNumber()}, isBot=${roundBefore.players[i].isBot}`
      );
    }

    const tx = await program.methods
      .commitAndSettle(roundId)
      .accounts({
        round: roundPDA,
        signer: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  commitAndSettle tx:", tx);

    const roundAfter = await program.account.round.fetch(roundPDA);
    expect(JSON.stringify(roundAfter.status)).to.include("settled");

    // Verify pro-rata payouts
    if (totalRevenue > 0) {
      let totalPayout = 0;
      for (let i = 0; i < 4; i++) {
        const player = roundAfter.players[i];
        if (player.isActive) {
          const expectedPayout = Math.floor(
            (player.revenue.toNumber() * pot) / totalRevenue
          );
          const actualPayout = player.payout.toNumber();
          // Allow for integer rounding — within 1 lamport
          expect(Math.abs(actualPayout - expectedPayout)).to.be.lessThanOrEqual(
            1
          );
          totalPayout += actualPayout;
          console.log(
            `  Player ${i}: payout=${actualPayout} lamports (expected≈${expectedPayout})`
          );
        }
      }

      // Player 0 (real player) should have the dominant share since they
      // were the cheapest and got all the customers
      const player0Payout = roundAfter.players[0].payout.toNumber();
      expect(player0Payout).to.be.greaterThan(0);

      // If only player 0 has revenue, they get the entire pot
      const otherRevenue =
        roundAfter.players[1].revenue.toNumber() +
        roundAfter.players[2].revenue.toNumber() +
        roundAfter.players[3].revenue.toNumber();

      if (otherRevenue === 0) {
        // Player 0 gets entire pot (they had all the revenue)
        expect(player0Payout).to.equal(pot);
        console.log(
          "  ✓ Player 0 receives entire pot (sole revenue earner)"
        );
      } else {
        console.log("  ✓ Payouts distributed pro-rata among earners");
      }
    } else {
      // No revenue → refund stakes (edge case)
      for (let i = 0; i < 4; i++) {
        const player = roundAfter.players[i];
        if (player.isActive && !player.isBot) {
          expect(player.payout.toNumber()).to.equal(stakeAmount.toNumber());
        }
      }
      console.log("  ✓ No revenue — stakes refunded");
    }

    console.log("  ✓ Round settled successfully");
  });
});

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
