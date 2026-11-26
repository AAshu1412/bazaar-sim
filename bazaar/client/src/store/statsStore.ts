import { create } from "zustand";
import { OPEN_HOUR, CLOSE_HOUR, type Outcome } from "../engine/economy";

/** One shop's books for one in-game day. Money is in cents of GD. Kept for this visit only. */
export interface ShopDay {
  price: number;
  sold: number;
  revenue: number;
  /** wholesale cost of the units sold (tracked for your shop only) */
  cost: number;
  /** GD actually paid for stock (restocks and auction wins; your shop only) */
  stockSpend: number;
  /** rent paid (your shop only) */
  rent: number;
  /** shoppers who wanted this shop's trade, and where they went */
  wanted: number;
  won: number;
  tooPricey: number;
  soldOut: number;
  rivals: Record<string, number>;
  hours: { mine: number; others: number }[];
}
export interface DayStats { day: number; shops: Record<number, ShopDay> }
export interface ShopperRow { id: number; priceCents: number; outcome: Outcome; rival?: string }

const KEEP_DAYS = 7;
export const emptyShop = (): ShopDay => ({
  price: 0, sold: 0, revenue: 0, cost: 0, stockSpend: 0, rent: 0, wanted: 0, won: 0, tooPricey: 0, soldOut: 0, rivals: {},
  hours: Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, () => ({ mine: 0, others: 0 })),
});
export const shopOn = (day: DayStats, id: number) => day.shops[id] ?? emptyShop();
export const profitOf = (d: ShopDay) => d.revenue - d.cost - d.rent;

interface Stats {
  days: DayStats[]; // oldest first; the last one is today
  startDay: (day: number) => void;
  shopper: (hour: number, rows: ShopperRow[]) => void;
  /** a shopper who chose this shop found its shelves empty on arrival */
  turnedAway: (id: number) => void;
  sale: (id: number, priceCents: number, unitCostCents: number) => void;
  spent: (cents: number) => void;
  paidRent: (cents: number) => void;
}

export const useStats = create<Stats>((set) => {
  const today = (ids: number[], change: (d: ShopDay, i: number) => ShopDay) => set((s) => {
    const last = s.days[s.days.length - 1], shops = { ...last.shops };
    ids.forEach((id, i) => { shops[id] = change(shops[id] ?? emptyShop(), i); });
    return { days: [...s.days.slice(0, -1), { ...last, shops }] };
  });
  return {
    days: [{ day: 1, shops: {} }],
    startDay: (day) => set((s) => ({ days: [...s.days, { day, shops: {} }].slice(-KEEP_DAYS) })),
    shopper: (hour, rows) => today(rows.map((r) => r.id), (d, i) => {
      const { outcome, rival, priceCents } = rows[i], mine = outcome === "mine";
      const at = Math.max(0, Math.min(d.hours.length - 1, hour - OPEN_HOUR));
      return {
        ...d,
        price: priceCents,
        wanted: d.wanted + 1,
        won: d.won + (mine ? 1 : 0),
        tooPricey: d.tooPricey + (outcome === "price" ? 1 : 0),
        soldOut: d.soldOut + (outcome === "soldout" ? 1 : 0),
        rivals: outcome === "rival" && rival ? { ...d.rivals, [rival]: (d.rivals[rival] ?? 0) + 1 } : d.rivals,
        hours: d.hours.map((h, k) => (k === at ? { mine: h.mine + (mine ? 1 : 0), others: h.others + (mine ? 0 : 1) } : h)),
      };
    }),
    turnedAway: (id) => today([id], (d) => ({ ...d, soldOut: d.soldOut + 1, won: Math.max(0, d.won - 1) })),
    sale: (id, priceCents, unitCostCents) => today([id], (d) => ({ ...d, price: priceCents, sold: d.sold + 1, revenue: d.revenue + priceCents, cost: d.cost + unitCostCents })),
    spent: (cents) => today([0], (d) => ({ ...d, stockSpend: d.stockSpend + cents })),
    paidRent: (cents) => today([0], (d) => ({ ...d, rent: d.rent + cents })),
  };
});
