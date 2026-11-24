import React, { useEffect, useRef, useState } from "react";
import { IsometricEngine } from "../engine/IsometricEngine";
import { useGameStore } from "../store/gameStore";
import { MapPin, Users, Coffee, Sparkles, Navigation } from "lucide-react";
import { sfx } from "../audio/sfx";

export const IsometricMarket: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsometricEngine | null>(null);

  const stalls = useGameStore((s) => s.stalls);
  const localPlayerIndex = useGameStore((s) => s.localPlayerIndex);
  const activeEvent = useGameStore((s) => s.activeEvent);

  const [activeCustomersCount, setActiveCustomersCount] = useState<number>(0);

  // Initialize engine on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new IsometricEngine();
    engine.init(containerRef.current);
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  // Sync stalls data to Pixi visual billboards
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateStallsData(stalls, localPlayerIndex);
  }, [stalls, localPlayerIndex]);

  // Sync weather events
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setWeatherEvent(activeEvent);
  }, [activeEvent]);

  // Continuous NPC customer flow loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!engineRef.current) return;
      const inStock = stalls.filter((s) => s.inventory > 0 && s.isActive);
      if (inStock.length > 0) {
        const cheapest = inStock.reduce((min, s) =>
          s.priceCents < min.priceCents ? s : min
        );
        engineRef.current.spawnCustomer(cheapest.index);
        setActiveCustomersCount((prev) => (prev % 18) + 1);
      }
    }, 1100);

    return () => clearInterval(interval);
  }, [stalls]);

  const handleStallFocus = (idx: number) => {
    sfx.playPriceClick();
    if (engineRef.current) {
      engineRef.current.retargetCustomers(idx);
    }
  };

  return (
    <div className="relative w-full h-[530px] rounded-2xl overflow-hidden border border-[#232f48] shadow-2xl bg-[#090d18] transition-all">
      {/* Pixi Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* District Title Badge (Top-Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-[#0d1322]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#232f48] shadow-lg">
        <div className="relative">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute inset-0" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs uppercase font-black tracking-wider text-white">
              Grand Crossroad
            </h2>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono font-bold">
              SEC 01
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
            <Navigation className="w-2.5 h-2.5 text-indigo-400" />
            2.5D Isometric • Sub-50ms Rollup
          </p>
        </div>
      </div>

      {/* Live Pedestrian Metric Badge (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-[#0d1322]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#232f48] text-[11px] text-gray-300 shadow-md font-mono">
        <Users className="w-3.5 h-3.5 text-cyan-400" />
        <span>Active Pedestrians:</span>
        <b className="text-emerald-400">{activeCustomersCount + 8}</b>
      </div>

      {/* Interactive Stall Selector Legend (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-[#0d1322]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#232f48] text-[11px] shadow-lg">
        {[
          { idx: 0, label: "You", color: "bg-amber-500", ring: "ring-amber-400/50" },
          { idx: 1, label: "Undercutter", color: "bg-blue-500", ring: "ring-blue-400/50" },
          { idx: 2, label: "Margin Hawk", color: "bg-emerald-500", ring: "ring-emerald-400/50" },
          { idx: 3, label: "Aggressive", color: "bg-purple-500", ring: "ring-purple-400/50" },
        ].map((item) => (
          <button
            key={item.idx}
            onClick={() => handleStallFocus(item.idx)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-300 hover:text-white transition-all ${
              localPlayerIndex === item.idx ? "bg-[#182238] border border-amber-500/40 text-amber-300 font-bold" : "hover:bg-gray-800/50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${item.color} ${localPlayerIndex === item.idx ? item.ring : ""}`} />
            <span className="text-[11px]">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Customer Routing Notice (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-[#0d1322]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#232f48] text-[10px] text-gray-400 shadow-md">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Customers pivot mid-stride when undercutting rivals</span>
      </div>
    </div>
  );
};
