import React, { useState } from "react";
import { Coffee, TrendingDown, DollarSign, Award, X } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, closeOnboarding } = useGameStore();
  const [step, setStep] = useState<number>(0);

  if (!showOnboarding) return null;

  const cards = [
    {
      title: "1. 4-Player Live Price War",
      icon: <Coffee className="w-8 h-8 text-amber-400" />,
      desc: "All 4 stalls sell Specialty Coffee at the city crossroad. Every 1 second, real customers flow through and buy strictly from the cheapest in-stock stall.",
    },
    {
      title: "2. Real-Time Repricing with Session Keys",
      icon: <TrendingDown className="w-8 h-8 text-blue-400" />,
      desc: "Reprice continuously via sub-50ms Ephemeral Rollups. No wallet popups! Customers pivot mid-stride the instant you undercut your rivals.",
    },
    {
      title: "3. Sealed-Bid TDX Auctions",
      icon: <DollarSign className="w-8 h-8 text-purple-400" />,
      desc: "Every 60s, bid for a +100 cargo refill. Bids are TDX-encrypted on Private ER so opponents cannot front-run or snipe you.",
    },
    {
      title: "4. Pro-Rata Pot Settlement",
      icon: <Award className="w-8 h-8 text-emerald-400" />,
      desc: "At t=300s, the entire SOL pot is settled pro-rata based on your earned revenue: payout_i = (revenue_i / total_revenue) * Pot.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-bazaar-surface border border-bazaar-border rounded-2xl p-6 shadow-2xl">
        <button
          onClick={closeOnboarding}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center py-4">
          <div className="p-4 bg-bazaar-card rounded-2xl border border-bazaar-border mb-4">
            {cards[step].icon}
          </div>
          <h3 className="text-lg font-extrabold text-white mb-2">
            {cards[step].title}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {cards[step].desc}
          </p>
        </div>

        {/* Steps Dots & Controls */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-bazaar-border">
          <div className="flex gap-1.5">
            {cards.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-amber-400 w-4" : "bg-bazaar-border"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step < cards.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={closeOnboarding}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-colors"
              >
                Enter Bazaar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
