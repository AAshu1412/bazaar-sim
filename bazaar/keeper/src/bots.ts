import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface StallState {
  authority?: string;
  priceCents: number;
  inventory: number;
  revenue: number;
  gdBalance: number;
  isBot: boolean;
  isActive: boolean;
}

export interface RoundState {
  roundId?: number;
  status?: "Lobby" | "Live" | "Ended" | "Settled";
  tick: number;
  auctionActive: boolean;
  currentAuctionId?: number;
  eventMultiplier?: number;
  viralStallIndex?: number;
  flashSaleStallIndex?: number;
  stalls: StallState[];
}

export interface BotDecision {
  type: "set_price" | "pass";
  action?: "set_price" | "pass";
  priceCents: number;
  reason: string;
}

export interface AuctionBidDecision {
  type: "bid" | "pass";
  action?: "bid" | "pass";
  amount: number;
  reason: string;
}

export enum BotPersona {
  Undercutter = "Undercutter",     // Slot 1: Undercuts cheapest in-stock rival by $0.10-$0.25
  MarginHawk = "MarginHawk",       // Slot 2: Raises prices when rivals drop below 15 units of stock
  AggressiveBidder = "Aggressive", // Slot 3: Bids 15-30% of gd_balance when inventory < 30 units
}

const MIN_PRICE_CENTS = 50;  // $0.50
const MAX_PRICE_CENTS = 1000; // $10.00
const DEFAULT_PRICE_CENTS = 300; // $3.00
const MIN_BID = 10;

// ═══════════════════════════════════════════════════════════════
// BOT DECISION ENGINES
// ═══════════════════════════════════════════════════════════════

/**
 * Slot 1: Undercutter Bot
 * Strategy: Find cheapest in-stock competitor and price $0.10-$0.25 below them,
 * bounded by $0.50. If bot has 0 inventory, preserves capital and holds price.
 */
export function decideUndercutter(
  botIndex: number,
  state: RoundState
): BotDecision {
  const myStall = state.stalls[botIndex];
  if (!myStall || !myStall.isActive || myStall.inventory <= 0) {
    return { type: "pass", action: "pass", priceCents: myStall?.priceCents || DEFAULT_PRICE_CENTS, reason: "Out of stock or inactive" };
  }

  // Find competitors who have inventory
  const rivalsWithStock = state.stalls.filter(
    (s, idx) => idx !== botIndex && s.isActive && s.inventory > 0
  );

  if (rivalsWithStock.length === 0) {
    // Monopoly situation: can price high!
    const targetPrice = Math.min(MAX_PRICE_CENTS, 750);
    if (myStall.priceCents !== targetPrice) {
      return {
        type: "set_price",
        action: "set_price",
        priceCents: targetPrice,
        reason: "No rivals in stock, raising price to harvest margin",
      };
    }
    return { type: "pass", action: "pass", priceCents: myStall.priceCents, reason: "Holding monopoly pricing" };
  }

  const cheapestRivalPrice = Math.min(...rivalsWithStock.map((s) => s.priceCents));
  // Undercut by 10 to 25 cents (deterministic pseudo-random based on tick)
  const undercutDelta = 10 + (state.tick % 16); 
  let targetPrice = Math.max(MIN_PRICE_CENTS, cheapestRivalPrice - undercutDelta);

  // If already at or within 5 cents of target, avoid spamming transactions
  if (Math.abs(myStall.priceCents - targetPrice) <= 5) {
    return { type: "pass", action: "pass", priceCents: myStall.priceCents, reason: `Price already competitive ($${(myStall.priceCents / 100).toFixed(2)})` };
  }

  return {
    type: "set_price",
    action: "set_price",
    priceCents: targetPrice,
    reason: `Undercutting rival ($${(cheapestRivalPrice / 100).toFixed(2)}) by $${(undercutDelta / 100).toFixed(2)}`,
  };
}

/**
 * Slot 2: Margin Hawk Bot
 * Strategy: Monitors market supply. When opponents are running low (<15 units),
 * raises prices to maximize revenue per customer. When market is flooded, stays at comfortable mid-margin ($3.50-$4.50).
 */
export function decideMarginHawk(
  botIndex: number,
  state: RoundState
): BotDecision {
  const myStall = state.stalls[botIndex];
  if (!myStall || !myStall.isActive || myStall.inventory <= 0) {
    return { type: "pass", action: "pass", priceCents: myStall?.priceCents || DEFAULT_PRICE_CENTS, reason: "Out of stock or inactive" };
  }

  const rivals = state.stalls.filter((s, idx) => idx !== botIndex && s.isActive);
  const totalRivalStock = rivals.reduce((sum, r) => sum + r.inventory, 0);
  const lowStockRivals = rivals.filter((r) => r.inventory < 15).length;

  let targetPrice = DEFAULT_PRICE_CENTS;

  if (lowStockRivals >= 2 || totalRivalStock < 25) {
    // Rivals starving of stock: spike price to $5.50 - $7.00
    targetPrice = 580;
  } else if (lowStockRivals === 1) {
    targetPrice = 420;
  } else {
    // Healthy market competition: steady quality pricing ($3.20)
    targetPrice = 320;
  }

  if (Math.abs(myStall.priceCents - targetPrice) <= 10) {
    return { type: "pass", action: "pass", priceCents: myStall.priceCents, reason: `Margin target stable ($${(myStall.priceCents / 100).toFixed(2)})` };
  }

  return {
    type: "set_price",
    action: "set_price",
    priceCents: targetPrice,
    reason: `Rival stock low (${totalRivalStock} total, ${lowStockRivals} starving). Target $${(targetPrice / 100).toFixed(2)}`,
  };
}

/**
 * Slot 3: Aggressive Bidder Bot
 * Strategy: Focuses on inventory dominance. In standard pricing, keeps an equilibrium price ($2.80-$3.10),
 * but monitors its stock levels fiercely.
 */
export function decideAggressiveBidderPrice(
  botIndex: number,
  state: RoundState
): BotDecision {
  const myStall = state.stalls[botIndex];
  if (!myStall || !myStall.isActive || myStall.inventory <= 0) {
    return { type: "pass", action: "pass", priceCents: myStall?.priceCents || DEFAULT_PRICE_CENTS, reason: "Out of stock or inactive" };
  }

  // If inventory is very high (> 100 units from winning auction), discount slightly to dump stock fast
  if (myStall.inventory > 80) {
    const targetPrice = 240;
    if (myStall.priceCents !== targetPrice) {
      return {
        type: "set_price",
        action: "set_price",
        priceCents: targetPrice,
        reason: `High inventory (${myStall.inventory} units). Dumping stock at volume discount`,
      };
    }
  } else if (myStall.inventory < 20) {
    // Conserve remaining inventory till next auction
    const targetPrice = 450;
    if (myStall.priceCents !== targetPrice) {
      return {
        type: "set_price",
        action: "set_price",
        priceCents: targetPrice,
        reason: `Low inventory (${myStall.inventory} units). Conserving stock until auction`,
      };
    }
  }

  return { type: "pass", action: "pass", priceCents: myStall.priceCents, reason: "Standard inventory flow maintained" };
}

/**
 * Auction Bidding Strategy per Bot Persona
 */
export function decideBotAuctionBid(
  botIndex: number,
  state: RoundState
): AuctionBidDecision {
  const myStall = state.stalls[botIndex];
  if (!myStall || !myStall.isActive || myStall.gdBalance < MIN_BID) {
    return { type: "pass", action: "pass", amount: 0, reason: "Insufficient GD balance" };
  }

  // Slot 1: Undercutter bids conservative 10-15% of GD balance
  if (botIndex === 1) {
    const bidAmount = Math.max(MIN_BID, Math.floor(myStall.gdBalance * 0.12));
    return {
      type: "bid",
      action: "bid",
      amount: Math.min(bidAmount, myStall.gdBalance),
      reason: "Undercutter conservative inventory refresh",
    };
  }

  // Slot 2: Margin Hawk bids based on current inventory deficit
  if (botIndex === 2) {
    if (myStall.inventory < 25) {
      const bidAmount = Math.max(MIN_BID, Math.floor(myStall.gdBalance * 0.20));
      return {
        type: "bid",
        action: "bid",
        amount: Math.min(bidAmount, myStall.gdBalance),
        reason: "Margin Hawk emergency inventory refill",
      };
    }
    // Otherwise modest bid
    return {
      type: "bid",
      action: "bid",
      amount: Math.max(MIN_BID, Math.floor(myStall.gdBalance * 0.08)),
      reason: "Margin Hawk opportunistic low bid",
    };
  }

  // Slot 3: Aggressive Bidder: bids 20-35% of gd_balance when inventory < 40 units!
  if (botIndex === 3) {
    if (myStall.inventory < 40) {
      const bidPct = 0.25 + ((state.tick % 10) / 100); // 25% - 34%
      const bidAmount = Math.max(MIN_BID, Math.floor(myStall.gdBalance * bidPct));
      return {
        type: "bid",
        action: "bid",
        amount: Math.min(bidAmount, myStall.gdBalance),
        reason: `Aggressive Bidder targeting auction win (${(bidPct * 100).toFixed(0)}% of balance)`,
      };
    }
    const modestBid = Math.max(MIN_BID, Math.floor(myStall.gdBalance * 0.15));
    return {
      type: "bid",
      action: "bid",
      amount: Math.min(modestBid, myStall.gdBalance),
      reason: "Aggressive Bidder baseline bid",
    };
  }

  // Generic fallback bot
  return {
    type: "bid",
    action: "bid",
    amount: Math.max(MIN_BID, Math.floor(myStall.gdBalance * 0.10)),
    reason: "Standard bot 10% bid",
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED ORCHESTRATION HELPERS
// ═══════════════════════════════════════════════════════════════

export function getBotPersonaName(botIndex: number): string {
  switch (botIndex) {
    case 1:
      return "Undercutter Bot";
    case 2:
      return "Margin Hawk Bot";
    case 3:
      return "Aggressive Bidder Bot";
    default:
      return `Bot #${botIndex}`;
  }
}

export function runBotTick(
  roundState: RoundState,
  botIndex: number
): BotDecision {
  switch (botIndex) {
    case 1:
      return decideUndercutter(botIndex, roundState);
    case 2:
      return decideMarginHawk(botIndex, roundState);
    case 3:
      return decideAggressiveBidderPrice(botIndex, roundState);
    default:
      return { type: "pass", action: "pass", priceCents: DEFAULT_PRICE_CENTS, reason: "Unknown bot persona" };
  }
}

export function runBotAuctionBid(
  roundState: RoundState,
  botIndex: number
): AuctionBidDecision {
  return decideBotAuctionBid(botIndex, roundState);
}
