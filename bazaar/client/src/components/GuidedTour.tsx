import React, { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  X,
  Store,
  DollarSign,
  TrendingDown,
  Building2,
  Lock,
  Bot,
  HelpCircle,
  Award,
} from "lucide-react";
import { sfx } from "../audio/sfx";

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusPlot: () => void;
  onOpenBank: () => void;
  onOpenAuction: () => void;
  onReprice: (price: number) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onClose,
  onFocusPlot,
  onOpenBank,
  onOpenAuction,
  onReprice,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "Welcome to Bazaar v2: The Onchain Tycoon",
      subtitle: "8 MagicBlock Primitives • Sub-50ms Ephemeral Rollup",
      badge: "ORIENTATION",
      icon: Store,
      iconColor: "text-amber-400 bg-amber-500/20 border-amber-500/40",
      content:
        "You have been granted Plot #0 Corner on MagicBlock Boulevard. Customers enter through the 4 city gates and choose whichever shop offers the highest economic utility (lowest price, brand upgrades, and corner foot-traffic).",
      actionText: "Take Me to My Shop (Plot #0)",
      onAction: () => {
        onFocusPlot();
        sfx.playPriceClick();
      },
    },
    {
      step: 2,
      title: "Sub-50ms Repricing via Session Keys",
      subtitle: "Instant Gasless Updates without Wallet Signatures",
      badge: "PRICING STRATEGY",
      icon: DollarSign,
      iconColor: "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
      content:
        "Rival shops and smart bots adjust prices dynamically. Try undercutting the market to $2.80! Watch approaching pedestrians immediately re-route their A* path across the cobblestones directly to your door.",
      actionText: "Undercut to $2.80",
      onAction: () => {
        onReprice(280);
        sfx.playPriceClick();
      },
    },
    {
      step: 3,
      title: "TDX Sealed-Bid Supply Auctions",
      subtitle: "Hardware-Enrypted Bidding on Private ER",
      badge: "INVENTORY LOGISTICS",
      icon: Lock,
      iconColor: "text-purple-400 bg-purple-500/20 border-purple-500/40",
      content:
        "Every 60 seconds, wholesale inventory shipments arrive. All 4 competitors submit TDX hardware-encrypted bids. Opponents cannot front-run or see your bid until the reveal gavel strikes!",
      actionText: "Inspect Sealed-Bid Auction",
      onAction: () => {
        onOpenAuction();
        sfx.playGavel();
      },
    },
    {
      step: 4,
      title: "Collateralized Loans & Crank Upkeep",
      subtitle: "First District Bank • Autonomous Liquidations",
      badge: "FINANCE & LEVERAGE",
      icon: Building2,
      iconColor: "text-blue-400 bg-blue-500/20 border-blue-500/40",
      content:
        "Borrow GD against your deed to finance facade upgrades or acquire rival shops. But maintain your health: if debt exceeds 80% LTV, autonomous MagicBlock Cranks trigger a Dutch auction liquidation!",
      actionText: "Visit First District Bank",
      onAction: () => {
        onOpenBank();
        sfx.playChing();
      },
    },
    {
      step: 5,
      title: "Empire Ready: Dominate the Neighborhood",
      subtitle: "Live Multiplayer World • Intelligent Bot Backfill",
      badge: "READY TO COMPETE",
      icon: Award,
      iconColor: "text-amber-400 bg-amber-500/20 border-amber-500/40",
      content:
        "You now hold all the tools to dominate the district. Watch the City Ledger ticker for real-time transactions, track your daily net worth, and hire autonomous bot managers to trade for you while offline.",
      actionText: "Start Playing Now",
      onAction: () => {
        onClose();
        sfx.playChing();
      },
    },
  ];

  const curr = steps[currentStep];

  const handleNext = () => {
    curr.onAction();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      sfx.playPriceClick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#1c1815]/95 border-2 border-[#d4a359]/60 rounded-3xl p-6 shadow-2xl text-[#f7f0e3]">
        {/* Top ambient banner */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d4a359]/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#d4a359]/20 rounded-xl border border-[#d4a359]/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base text-white">Merchant Guild Tour</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/40 font-bold">
                  STEP {curr.step} / {steps.length}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">0-to-100 Interactive Tycoon Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="py-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border ${curr.iconColor} shrink-0`}>
              <curr.icon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400 block mb-1">
                {curr.badge}
              </span>
              <h4 className="font-serif font-black text-lg text-white mb-1">{curr.title}</h4>
              <p className="text-xs text-gray-400 font-mono">{curr.subtitle}</p>
            </div>
          </div>

          <div className="bg-[#120f0d] p-4 rounded-2xl border border-[#d4a359]/25 text-sm text-gray-200 leading-relaxed font-sans shadow-inner">
            {curr.content}
          </div>

          {/* Stepper Dots */}
          <div className="flex justify-center items-center gap-2 pt-2">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-8 bg-amber-400"
                    : idx < currentStep
                    ? "w-2 bg-emerald-400"
                    : "w-2 bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#d4a359]/20">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
              currentStep === 0
                ? "opacity-30 border-gray-700 text-gray-600 cursor-not-allowed"
                : "border-[#d4a359]/40 text-gray-300 hover:bg-white/10"
            }`}
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-98"
          >
            <span>{curr.actionText}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
