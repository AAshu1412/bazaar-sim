import { create } from "zustand";
import { OPEN_HOUR, CLOSE_HOUR, type Outcome } from "../engine/economy";

/** Your shop's books for one in-game day. Money is in cents of GD. Kept for this visit only. */
export interface DayStats {
  day: number;
  sold: number;
  revenue: number;
  /** wholesale cost of the units sold */
  cost: number;
  /** GD actually paid for stock (restocks and auction wins) */
  stockSpend: number;
  /** shoppers who wanted your trade, and where they went */
  wanted: number;
  won: number;
  tooPricey: number;
  soldOut: number;
  rivals: Record<string, number>;
  hours: { mine: number; others: number }[];
}
const KEEP_DAYS = 7;
export const emptyDay = (day: number): DayStats => ({
  day, sold: 0, revenue: 0, cost: 0, stockSpend: 0, wanted: 0, won: 0, tooPricey: 0, soldOut: 0, rivals: {},
  hours: Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, () => ({ mine: 0, others: 0 })),
});
export const profitOf = (d: DayStats) => d.revenue - d.cost;

interface Stats {
  days: DayStats[]; // oldest first; the last one is today
  startDay: (day: number) => void;
  shopper: (hour: number, outcome: Outcome, rival?: string) => void;
  /** a shopper who chose you found the shelves empty on arrival */
  turnedAway: () => void;
  sale: (priceCents: number, unitCostCents: number) => void;
  spent: (cents: number) => void;
}

export const useStats = create<Stats>((set) => {
  const today = (change: (d: DayStats) => DayStats) => set((s) => ({ days: [...s.days.slice(0, -1), change(s.days[s.days.length - 1])] }));
  return {
    days: [emptyDay(1)],
    startDay: (day) => set((s) => ({ days: [...s.days, emptyDay(day)].slice(-KEEP_DAYS) })),
    shopper: (hour, outcome, rival) => today((d) => {
      const i = Math.max(0, Math.min(d.hours.length - 1, hour - OPEN_HOUR)), mine = outcome === "mine";
      return {
        ...d,
        wanted: d.wanted + 1,
        won: d.won + (mine ? 1 : 0),
        tooPricey: d.tooPricey + (outcome === "price" ? 1 : 0),
        soldOut: d.soldOut + (outcome === "soldout" ? 1 : 0),
        rivals: outcome === "rival" && rival ? { ...d.rivals, [rival]: (d.rivals[rival] ?? 0) + 1 } : d.rivals,
        hours: d.hours.map((h, k) => (k === i ? { mine: h.mine + (mine ? 1 : 0), others: h.others + (mine ? 0 : 1) } : h)),
      };
    }),
    turnedAway: () => today((d) => ({ ...d, soldOut: d.soldOut + 1, won: Math.max(0, d.won - 1) })),
    sale: (priceCents, unitCostCents) => today((d) => ({ ...d, sold: d.sold + 1, revenue: d.revenue + priceCents, cost: d.cost + unitCostCents })),
    spent: (cents) => today((d) => ({ ...d, stockSpend: d.stockSpend + cents })),
  };
});
