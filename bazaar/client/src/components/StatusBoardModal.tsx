import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Clock,
  Sparkles,
  BarChart3,
  X,
  Shield,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { sfx } from "../audio/sfx";

interface StatusBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  cashGd: number;
  netWorthGd: number;
  reputation: number;
  customersServedToday: number;
  revenueTodayCents: number;
  wholesaleExpensesCents: number;
  rentExpensesCents: number;
  stallsLeaderboard: {
    name: string;
    owner: string;
    priceCents: number;
    inventory: number;
    customersServed: number;
    revenueCents: number;
    isPlayer: boolean;
  }[];
}

export const StatusBoardModal: React.FC<StatusBoardModalProps> = ({
  isOpen,
  onClose,
  day,
  cashGd,
  netWorthGd,
  reputation,
  customersServedToday,
  revenueTodayCents,
  wholesaleExpensesCents,
  rentExpensesCents,
  stallsLeaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<"pnl" | "competitors" | "breakdown">("pnl");

  if (!isOpen) return null;

  const grossProfitCents = revenueTodayCents - (wholesaleExpensesCents + rentExpensesCents);
  const isProfitable = grossProfitCents >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#1c1815]/95 border-2 border-[#d4a359]/60 rounded-3xl p-6 shadow-2xl text-[#f7f0e3]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d4a359]/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/40 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-lg text-white">City Status & P&L Board</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/40 font-bold">
                  DAY {day} / 7
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">Live Economics & Competitive Performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-4 pb-2 border-b border-[#d4a359]/15 text-xs font-mono">
          <button
            onClick={() => setActiveTab("pnl")}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeTab === "pnl"
                ? "bg-[#d4a359]/25 text-amber-300 border-[#d4a359]/50 font-bold"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Today's P&L Statement
          </button>
          <button
            onClick={() => setActiveTab("competitors")}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeTab === "competitors"
                ? "bg-[#d4a359]/25 text-amber-300 border-[#d4a359]/50 font-bold"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Neighborhood Leaderboard
          </button>
        </div>

        {/* Tab 1: P&L Statement */}
        {activeTab === "pnl" && (
          <div className="py-4 space-y-4">
            {/* Top 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#120f0d] p-3.5 rounded-2xl border border-[#d4a359]/25">
                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">Customers Served</span>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-black text-xl text-white">{customersServedToday}</span>
                </div>
              </div>

              <div className="bg-[#120f0d] p-3.5 rounded-2xl border border-[#d4a359]/25">
                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">Today's Revenue</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-black text-xl text-emerald-400">
                    ${(revenueTodayCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-[#120f0d] p-3.5 rounded-2xl border border-[#d4a359]/25">
                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">Net Profit Today</span>
                <div className="flex items-center gap-1.5">
                  {isProfitable ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={`font-mono font-black text-xl ${
                      isProfitable ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isProfitable ? "+" : ""}${(grossProfitCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized P&L Ledger */}
            <div className="bg-[#120f0d] p-4 rounded-2xl border border-[#d4a359]/25 font-mono text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-gray-800 text-gray-400">
                <span>Income / Expense Item</span>
                <span>Amount (GD / USD)</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>(+) Specialty Coffee Retail Sales ({customersServedToday} units)</span>
                <span>+${(revenueTodayCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>(-) Wholesale Sealed-Bid Inventory</span>
                <span>-${(wholesaleExpensesCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>(-) Daily Corner Plot Lease (MagicBlock Crank)</span>
                <span>-${(rentExpensesCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#d4a359]/30 font-black text-sm text-white">
                <span>Net Daily Cashflow</span>
                <span className={isProfitable ? "text-emerald-400" : "text-red-400"}>
                  {isProfitable ? "+" : ""}${(grossProfitCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Competitor Leaderboard */}
        {activeTab === "competitors" && (
          <div className="py-4 space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
            <div className="grid grid-cols-12 gap-2 text-gray-400 text-[10px] pb-1 border-b border-gray-800 px-3">
              <span className="col-span-4">Shop & Proprietor</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Stock</span>
              <span className="col-span-2 text-right">Served</span>
              <span className="col-span-2 text-right">Revenue</span>
            </div>

            {stallsLeaderboard.map((stall, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-all ${
                  stall.isPlayer
                    ? "bg-[#091b14] border-emerald-500/50 text-white font-bold"
                    : "bg-[#120f0d] border-[#d4a359]/20 text-gray-300"
                }`}
              >
                <div className="col-span-4 flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold">#{idx + 1}</span>
                  <div>
                    <span className="block truncate">{stall.name}</span>
                    <span className="text-[9px] text-gray-500 block truncate">{stall.owner}</span>
                  </div>
                </div>
                <div className="col-span-2 text-right text-amber-300 font-bold">
                  ${(stall.priceCents / 100).toFixed(2)}
                </div>
                <div className="col-span-2 text-right">
                  <span className={stall.inventory > 10 ? "text-emerald-400" : "text-red-400"}>
                    {stall.inventory}
                  </span>
                </div>
                <div className="col-span-2 text-right text-cyan-400">{stall.customersServed}</div>
                <div className="col-span-2 text-right text-emerald-400 font-bold">
                  ${(stall.revenueCents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
