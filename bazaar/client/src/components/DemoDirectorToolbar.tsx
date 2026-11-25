import React, { useState } from "react";
import { Sliders, FastForward, Sun, Moon, TrendingUp, AlertOctagon, Trophy, X } from "lucide-react";
import { sfx } from "../audio/sfx";

interface DemoDirectorToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onToggleNight: () => void;
  onSimulateSolPump: () => void;
  onTriggerMarginCall: () => void;
  onFastForwardDay: () => void;
  isNight: boolean;
  solPriceChange: number;
}

export const DemoDirectorToolbar: React.FC<DemoDirectorToolbarProps> = ({
  isOpen,
  onToggle,
  onToggleNight,
  onSimulateSolPump,
  onTriggerMarginCall,
  onFastForwardDay,
  isNight,
  solPriceChange,
}) => {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-[11.5rem] left-24 z-40 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-black text-xs rounded-xl shadow-xl border border-indigo-400/50 flex items-center gap-2 transition-all active:scale-95"
      >
        <Sliders className="w-4 h-4" />
        <span>Judge Demo Toolbar</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-[11.5rem] left-24 z-40 bg-[#0e1424] border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl w-80 backdrop-blur-md animate-slideUp">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#232f48]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h4 className="font-black text-xs text-white uppercase tracking-wider font-mono">
            Demo Director Control
          </h4>
        </div>
        <button onClick={onToggle} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mb-3">
        1-Click triggers for hackathon judges & demo video recording:
      </p>

      <div className="space-y-2 text-xs font-mono">
        <button
          onClick={onToggleNight}
          className="w-full py-2 px-3 bg-[#141b2e] hover:bg-gray-800 border border-bazaar-border rounded-xl text-gray-200 flex items-center justify-between transition-all"
        >
          <span className="flex items-center gap-2">
            {isNight ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {isNight ? "Switch to Daylight" : "Overnight (Managers Only)"}
          </span>
          <span className="text-[10px] text-indigo-300 font-bold">{isNight ? "NIGHT" : "DAY"}</span>
        </button>

        <button
          onClick={onSimulateSolPump}
          className="w-full py-2 px-3 bg-[#141b2e] hover:bg-gray-800 border border-bazaar-border rounded-xl text-gray-200 flex items-center justify-between transition-all"
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Pyth SOL +5% Pump Sim
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">
            {solPriceChange > 0 ? `+${solPriceChange}%` : "FLAT"}
          </span>
        </button>

        <button
          onClick={onTriggerMarginCall}
          className="w-full py-2 px-3 bg-[#141b2e] hover:bg-gray-800 border border-bazaar-border rounded-xl text-gray-200 flex items-center justify-between transition-all"
        >
          <span className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            Force Rival Margin Call
          </span>
          <span className="text-[10px] text-red-400 font-bold">LTV 85%</span>
        </button>

        <button
          onClick={onFastForwardDay}
          className="w-full py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 rounded-xl text-indigo-300 flex items-center justify-between transition-all"
        >
          <span className="flex items-center gap-2">
            <FastForward className="w-4 h-4" />
            Advance Day / Opening Bell
          </span>
          <span className="text-[10px] font-bold">DAY+1</span>
        </button>
      </div>
    </div>
  );
};
