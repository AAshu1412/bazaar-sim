import React from "react";
import { Minus, Plus, Zap } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { sfx } from "../audio/sfx";
import { onChainService } from "../solana/onChainService";

export const PriceControl: React.FC = () => {
  const { stalls, localPlayerIndex, roundId, sessionKeypair, setLocalPrice, addLedgerItem } = useGameStore();
  const myStall = stalls[localPlayerIndex];

  if (!myStall) return null;

  const handlePriceChange = async (newCents: number) => {
    const clamped = Math.max(50, Math.min(1000, newCents));
    setLocalPrice(clamped);
    sfx.playPriceClick();

    if (sessionKeypair) {
      const res = await onChainService.setPriceOnChain(roundId, localPlayerIndex, clamped, sessionKeypair);
      addLedgerItem({
        type: "PRICE",
        message: `Stall #0 repriced → $${(clamped / 100).toFixed(2)}${res.isLive ? " (On-Chain)" : ""}`,
        signature: res.signature,
        latencyMs: res.latencyMs,
        network: "ER",
      });
    }
  };

  return (
    <div className="bg-bazaar-surface border border-bazaar-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Your Stall Price (Session Key)
        </span>
        <span className="font-mono text-xl font-extrabold text-amber-400">
          ${(myStall.priceCents / 100).toFixed(2)}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={50}
        max={1000}
        step={5}
        value={myStall.priceCents}
        onChange={(e) => handlePriceChange(Number(e.target.value))}
        className="w-full accent-amber-500 cursor-pointer h-2 bg-bazaar-card rounded-lg"
      />

      {/* Steppers & Presets */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => handlePriceChange(myStall.priceCents - 10)}
            className="p-1.5 bg-bazaar-card hover:bg-bazaar-border text-gray-200 rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePriceChange(myStall.priceCents + 10)}
            className="p-1.5 bg-bazaar-card hover:bg-bazaar-border text-gray-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 font-mono text-[11px]">
          {[150, 250, 300, 450].map((preset) => (
            <button
              key={preset}
              onClick={() => handlePriceChange(preset)}
              className="px-2 py-1 bg-bazaar-card hover:bg-bazaar-border text-gray-300 rounded-md transition-colors"
            >
              ${(preset / 100).toFixed(2)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
