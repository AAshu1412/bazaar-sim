import React from "react";
import { Building, ShieldCheck, DollarSign, TrendingUp, X, Sparkles, Award } from "lucide-react";
import { PlotInfo } from "../engine/IsometricEngineV3";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { interiorFor } from "../engine/buildingRegistry";

interface PlotInspectorProps {
  plot: PlotInfo | null;
  onClose: () => void;
  onReprice: (plotId: number, newPriceCents: number) => void;
  onHireManager: (plotId: number) => void;
  onScoutPlot: (plotId: number) => void;
}

export const PlotInspector: React.FC<PlotInspectorProps> = ({
  plot,
  onClose,
  onReprice,
  onHireManager,
  onScoutPlot,
}) => {
  if (!plot) return null;

  const isLocalOwner = plot.id === 0;

  return (
    <div className="fixed top-20 right-6 z-40 w-84 bg-[#1c1815]/95 border border-[#d4a359]/40 rounded-2xl p-5 shadow-2xl backdrop-blur-md text-[#f7f0e3] animate-slideLeft">
      {/* Top Header */}
      <div className="flex items-start justify-between pb-3 border-b border-[#d4a359]/20 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#d4a359]/20 rounded-xl border border-[#d4a359]/40 text-amber-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif font-black text-sm text-white">Plot #{plot.id}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                {plot.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">{plot.streetName}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <InteriorBanner
        src={interiorFor(plot.ownerType === "unclaimed" ? "Vacant" : plot.businessType, plot.isUpgraded)}
        alt={`${plot.businessType} interior`}
        className="mb-3"
      />

      {/* Business Details */}
      <div className="space-y-3 font-mono text-xs mb-4">
        <div className="bg-[#120f0d] p-3 rounded-xl border border-[#d4a359]/20 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 font-sans">Business:</span>
            <span className="font-bold text-amber-300">{plot.businessType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-sans">Proprietor:</span>
            <span className={isLocalOwner ? "text-emerald-400 font-bold" : "text-gray-300"}>
              {plot.owner || "Unclaimed (Auctionable)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-sans">Current Price:</span>
            <span className="font-bold text-white">${(plot.priceCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-sans">Inventory:</span>
            <span className="font-bold text-emerald-400">{plot.inventory} Units</span>
          </div>
          {plot.isUpgraded && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold pt-1">
              <Sparkles className="w-3 h-3" />
              <span>Upgraded Facade (+10% Price Tolerance)</span>
            </div>
          )}
        </div>

        {/* If local owner: repricing slider */}
        {isLocalOwner ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-sans">
              <span className="text-gray-400 font-bold">Reprice Stall (Session Key):</span>
              <span className="font-mono font-black text-amber-400">${(plot.priceCents / 100).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={100}
              max={600}
              step={10}
              value={plot.priceCents}
              onChange={(e) => onReprice(plot.id, Number(e.target.value))}
              className="w-full accent-[#d4a359] h-2 bg-gray-800 rounded-lg cursor-pointer"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onHireManager(plot.id)}
                className="flex-1 py-2 bg-[#d4a359]/20 hover:bg-[#d4a359]/30 text-amber-300 border border-[#d4a359]/40 rounded-xl font-bold font-sans text-xs transition-all"
              >
                Hire Manager
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-1">
            <button
              onClick={() => onScoutPlot(plot.id)}
              className="w-full py-2.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/50 rounded-xl font-bold font-sans text-xs transition-all flex items-center justify-center gap-2"
            >
              Scout Secret Unit Cost (500 GD)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
