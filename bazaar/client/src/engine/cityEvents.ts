import type { EventType } from "../store/gameStore";

/** Event kinds 1..5 as emitted by the program's `callback_city_event` (VRF). */
const KINDS: EventType[] = ["DemandSurge", "DemandDrop", "ViralStall", "SupplyShock", "FlashSale"];
export const EVENT_SECONDS = 30;

export interface CityEvent { name: EventType; target: number; signature: string }

export function parseCityEvent(logs: string[]): Omit<CityEvent, "signature"> | null {
  for (const l of logs) {
    const m = l.match(/CityEvent kind=(\d+) target=(\d+)/);
    if (m && KINDS[Number(m[1]) - 1]) return { name: KINDS[Number(m[1]) - 1], target: Number(m[2]) };
  }
  return null;
}

export const EVENT_TITLES: Record<EventType, string> = {
  Quiet: "", DemandSurge: "Market rush", DemandDrop: "Rainy spell", ViralStall: "Gone viral", SupplyShock: "Supply scare", FlashSale: "Bargain frenzy",
};

/** How an event bends the customer demand formula. */
export function demandModifiers(event: EventType) {
  return {
    customersPerTick: event === "DemandSurge" ? 2 : event === "DemandDrop" ? 0.5 : 1,
    priceWeight: event === "SupplyShock" ? 0.4 : event === "FlashSale" ? 2.5 : 1,
    viralBonus: event === "ViralStall" ? 1.2 : 0, // added to the targeted shop's utility
  };
}
