import React from "react";
import { Flame, CloudRain, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { useGameStore, EventType } from "../store/gameStore";

export const EventBanner: React.FC = () => {
  const { activeEvent } = useGameStore();

  if (activeEvent === "Quiet") return null;

  const eventConfigs: Record<EventType, { title: string; desc: string; icon: React.ReactNode; color: string }> = {
    DemandSurge: {
      title: "DEMAND SURGE",
      desc: "Market rush! Twice as many shoppers",
      icon: <TrendingUp className="w-4 h-4" />,
      color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    DemandDrop: {
      title: "RAIN & SLOWDOWN",
      desc: "Gloomy weather: half as many shoppers",
      icon: <CloudRain className="w-4 h-4" />,
      color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    },
    ViralStall: {
      title: "VIRAL SOCIAL SPIKE",
      desc: "One stall went viral and is pulling in shoppers",
      icon: <Flame className="w-4 h-4" />,
      color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    },
    SupplyShock: {
      title: "SUPPLY SHOCK",
      desc: "Shortage rumours: shoppers put up with higher prices",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "bg-red-500/20 text-red-300 border-red-500/40",
    },
    FlashSale: {
      title: "BARGAIN FRENZY",
      desc: "Bargain frenzy: shoppers chase the lowest price",
      icon: <Sparkles className="w-4 h-4" />,
      color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    },
    Quiet: {
      title: "",
      desc: "",
      icon: null,
      color: "",
    },
  };

  const config = eventConfigs[activeEvent];

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border backdrop-blur-md animate-pulse ${config.color}`}
    >
      <div className="flex items-center gap-2.5 font-bold text-xs">
        {config.icon}
        <span>{config.title}:</span>
        <span className="font-normal opacity-90">{config.desc}</span>
      </div>
      <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold px-2 py-0.5 rounded bg-black/40">
        VRF Event
      </span>
    </div>
  );
};
