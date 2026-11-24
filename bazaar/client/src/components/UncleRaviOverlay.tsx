import React, { useState } from "react";
import { MessageSquare, ChevronRight, Award, SkipForward } from "lucide-react";
import { sfx } from "../audio/sfx";

interface UncleRaviOverlayProps {
  currentStage: number; // 0: Welcome/Lease, 1: Bank/Auction, 2: Managers/Scouts
  onAdvance: () => void;
  onDismiss: () => void;
}

export const UncleRaviOverlay: React.FC<UncleRaviOverlayProps> = ({
  currentStage,
  onAdvance,
  onDismiss,
}) => {
  const dialogues = [
    {
      title: "Uncle Ravi (Retired Shopkeeper)",
      tagline: "Day 1: Subsidized Side Street Lease",
      speech:
        "Welcome to the Grand District, kid! When I ran my first coffee cart here in '08, we fought for every cent. I've secured you a subsidized lease on Side Street. Set your price carefully — if you undercut the rivals, customers will pivot mid-stride right into your shop!",
      action: "Claim Side Street Lease & Start Day 1",
    },
    {
      title: "Uncle Ravi (Retired Shopkeeper)",
      tagline: "Day 2: Bank Loans & Sealed Property Auctions",
      speech:
        "You survived Day 1 and booked real revenue! Now it's time to build an empire. The First District Bank is offering loans backed by your plots, but watch your LTV or they'll trigger a margin call. Also, a vacant Corner plot is going to sealed-bid auction on Private ER — bid in secret!",
      action: "Unlock Bank & Property Auctions",
    },
    {
      title: "Uncle Ravi (Retired Shopkeeper)",
      tagline: "Day 3: Manager Agents & Confidential Scouts",
      speech:
        "Two shops and only one of you? Time to delegate. Hire an autonomous Manager Agent with a scoped session key to undercut rivals while you sleep. And if you're curious what wholesale cost your rivals paid, pay 500 GD to deploy a scout!",
      action: "Unlock Autonomous Managers & Scouts",
    },
  ];

  const current = dialogues[currentStage] || dialogues[0];

  const handleNext = () => {
    sfx.playPriceClick();
    onAdvance();
  };

  return (
    <div className="fixed bottom-16 right-6 z-40 max-w-md w-full animate-slideUp">
      <div className="bg-[#0e1424]/95 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />

        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            👴🏾
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-amber-400">{current.title}</h4>
              <button
                onClick={onDismiss}
                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800/60 px-2 py-0.5 rounded"
              >
                <SkipForward className="w-2.5 h-2.5" /> Skip
              </button>
            </div>
            <span className="text-[11px] text-indigo-300 font-mono block mt-0.5 font-bold">
              {current.tagline}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-200 leading-relaxed mb-4 bg-[#141b2e] p-3 rounded-xl border border-bazaar-border">
          "{current.speech}"
        </p>

        <button
          onClick={handleNext}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-98"
        >
          <span>{current.action}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
