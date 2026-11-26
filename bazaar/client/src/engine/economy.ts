/**
 * The town's demand model: what shoppers want at each hour, what they will pay, which shop wins them, and how rivals
 * react overnight. Pure (no imports), so `npm run check` can exercise it in node.
 */
export type Trade = "CoffeeCart" | "StreetFood" | "Electronics" | "FlowerStall" | "Bookshop";
export const TRADES: Trade[] = ["CoffeeCart", "StreetFood", "Electronics", "FlowerStall", "Bookshop"];

/** daily rent your shop pays to the town (matches SHOP_RENT_GD in the program) */
export const SHOP_RENT = 20, MAX_RENT_DAYS = 12;
export const OPEN_HOUR = 6, CLOSE_HOUR = 22, DAY_SECONDS = 150;
export function clockAt(seconds: number) {
  const into = (seconds % DAY_SECONDS) / DAY_SECONDS;
  return { day: Math.floor(seconds / DAY_SECONDS) + 1, hour: OPEN_HOUR + Math.floor(into * (CLOSE_HOUR - OPEN_HOUR)) };
}

/** share of shoppers wanting each trade (same order as TRADES), by time of day; each row sums to 100 */
const MIX: { until: number; name: string; weights: number[] }[] = [
  { until: 11, name: "Morning coffee rush", weights: [55, 15, 8, 12, 10] },
  { until: 14, name: "Lunch rush", weights: [22, 48, 10, 8, 12] },
  { until: 18, name: "Afternoon browsing", weights: [28, 14, 24, 10, 24] },
  { until: 24, name: "Evening stroll", weights: [20, 35, 10, 25, 10] },
];
export const period = (hour: number) => MIX.find((m) => hour < m.until) ?? MIX[MIX.length - 1];
export function pickTrade(hour: number, rnd: () => number): Trade {
  let roll = rnd() * 100;
  const i = period(hour).weights.findIndex((w) => (roll -= w) < 0);
  return TRADES[i < 0 ? 0 : i];
}

/** the going rate in cents; a shopper's budget is spread around it */
export const FAIR_PRICE: Record<Trade, number> = { CoffeeCart: 300, StreetFood: 340, Electronics: 320, FlowerStall: 305, Bookshop: 300 };
export type Tier = "Corner" | "MainStreet" | "SideStreet" | "Alley";
/** how much a plot adds to a shop's score; 0.45 pulls shoppers like a price $0.45 lower than the same shop in an alley */
export const FOOT_TRAFFIC: Record<Tier, number> = { Corner: 0.45, MainStreet: 0.25, SideStreet: 0.1, Alley: 0 };

export interface Seller { id: number; type: string; priceCents: number; stock: number; tier: Tier; brand: boolean }
/** what the active city event does to a decision */
export interface Mood { priceWeight: number; viralId: number | null; viralBonus: number }
export const CALM: Mood = { priceWeight: 1, viralId: null, viralBonus: 0 };

/** One shopper picks among the shops selling what they want, or walks away. */
export function chooseShop<S extends Seller>(sellers: S[], want: Trade, mood: Mood, rnd: () => number) {
  const tolerance = mood.priceWeight < 1 ? 1.15 : mood.priceWeight > 1 ? 0.92 : 1;
  const budget = FAIR_PRICE[want] * (0.9 + rnd() * 0.45) * tolerance;
  let winner: S | null = null, best = -Infinity;
  for (const s of sellers) {
    if (s.type !== want || s.stock <= 0 || s.priceCents > budget) continue;
    const score = (-s.priceCents / 100) * mood.priceWeight + FOOT_TRAFFIC[s.tier] + (s.brand ? 0.35 : 0)
      + (s.id === mood.viralId ? mood.viralBonus : 0) + (rnd() - 0.5) * 0.8; // personal taste
    if (score > best) { best = score; winner = s; }
  }
  return { winner, budget };
}

export type Outcome = "mine" | "rival" | "price" | "soldout";
/** Why a shopper who wanted your trade did (or did not) come to you. */
export function outcomeFor(me: Seller, choice: { winner: Seller | null; budget: number }): Outcome {
  if (choice.winner?.id === me.id) return "mine";
  if (me.stock <= 0) return "soldout";
  return me.priceCents > choice.budget ? "price" : "rival";
}

/** small seeded generator, so the price advisor draws the same crowd for every price */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** For each candidate price: the share of your trade's shoppers you would win, and profit (cents) per 100 of them. */
export function priceCurve(sellers: Seller[], myId: number, unitCostCents: number, prices: number[], crowd = 600) {
  const me = sellers.find((s) => s.id === myId);
  if (!me) return [];
  return prices.map((priceCents) => {
    const trial = { ...me, priceCents, stock: 1 };
    const field = sellers.map((s) => (s.id === myId ? trial : s));
    let won = 0;
    for (let i = 0; i < crowd; i++) if (chooseShop(field, me.type as Trade, CALM, seeded(i * 7919 + 1)).winner?.id === myId) won++;
    const share = won / crowd;
    return { priceCents, share, profitPer100: Math.round(share * 100 * (priceCents - unitCostCents)) };
  });
}

/** Overnight a rival raises prices after a busy day and cuts them after a quiet one. */
export function nextRivalPrice(priceCents: number, sold: number, openingStock: number, trade: Trade) {
  const step = sold >= openingStock * 0.6 ? 10 : sold <= openingStock * 0.15 ? -10 : 0;
  const fair = FAIR_PRICE[trade];
  return Math.round(Math.max(fair * 0.85, Math.min(fair * 1.3, priceCents + step)) / 5) * 5;
}
