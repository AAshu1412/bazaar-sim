import React from "react";
import { useGameStore, EventType } from "../store/gameStore";
import { EVENT_SECONDS, EVENT_TITLES } from "../engine/cityEvents";
import { Badge } from "./ui";

const EVENTS: Record<Exclude<EventType, "Quiet">, { desc: string; icon: string }> = {
  DemandSurge: { desc: "Twice as many shoppers", icon: "people" },
  DemandDrop: { desc: "Half as many shoppers", icon: "pin" },
  ViralStall: { desc: "One shop is pulling in the crowd", icon: "eye" },
  SupplyShock: { desc: "Shoppers put up with higher prices", icon: "crate" },
  FlashSale: { desc: "Shoppers chase the lowest price", icon: "tag" },
};

/** The VRF-drawn city event, with a bar showing how long it lasts. */
export const EventBanner: React.FC = () => {
  const activeEvent = useGameStore((s) => s.activeEvent);
  if (activeEvent === "Quiet") return null;
  const e = EVENTS[activeEvent];

  return (
    <div key={activeEvent} role="status" className="panel mx-auto w-fit min-w-[320px] animate-pop overflow-hidden !bg-gold">
      <div className="flex items-center gap-3 px-3 py-2">
        <Badge icon={e.icon} size={40} />
        <div className="flex-1">
          <div className="font-display text-base font-semibold leading-tight">{EVENT_TITLES[activeEvent]}</div>
          <div className="text-xs font-bold">{e.desc}</div>
        </div>
        <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-display text-xs font-semibold" title="Drawn by MagicBlock VRF">VRF</span>
      </div>
      <div className="drain-bar h-1.5 origin-left bg-ink" style={{ animation: `drain ${EVENT_SECONDS}s linear forwards` }} />
    </div>
  );
};
