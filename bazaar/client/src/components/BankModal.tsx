import React, { useState } from "react";
import { Building2, AlertTriangle, ShieldCheck, DollarSign, X } from "lucide-react";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { landmarkInterior } from "../engine/buildingRegistry";

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  reputation: number;
}

export const BankModal: React.FC<BankModalProps> = ({ isOpen, onClose, reputation }) => {
  const [borrowAmount, setBorrowAmount] = useState<number>(5000);
  const [currentDebt, setCurrentDebt] = useState<number>(0);

  if (!isOpen) return null;

  // Loan rate scaled inversely by reputation (3% to 8%)
  const rateBps = Math.max(300, 800 - reputation * 5);
  const ratePct = (rateBps / 100).toFixed(1);

  const handleBorrow = () => {
    setCurrentDebt((prev) => prev + borrowAmount);
    sfx.playChing();
    onClose();
  };

  const handleRepay = () => {
    setCurrentDebt(0);
    sfx.playPriceClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#0e1424] border border-[#232f48] rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <InteriorBanner src={landmarkInterior("bank")} alt="Bank vault interior" className="mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">First District Bank (NPC)</h3>
            <p className="text-xs text-gray-400 font-mono">
              Collateralized Lending • Crank-Enforced LTV (80%)
            </p>
          </div>
        </div>

        {/* Reputation Badge */}
        <div className="bg-[#141c2e] p-3 rounded-xl border border-bazaar-border mb-4 flex justify-between items-center text-xs">
          <div>
            <span className="text-gray-400 block">Your Credit Reputation</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{reputation}/100</span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 block">Interest Rate</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{ratePct}% / day</span>
          </div>
        </div>

        {/* Active Debt / Health Bar */}
        {currentDebt > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Outstanding Debt
              </span>
              <span className="font-mono font-bold text-white">{currentDebt} GD</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-[65%]" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block font-mono">
              Collateral: Plot #0 Corner (LTV: 65% • Margin Call at 80%)
            </span>
          </div>
        )}

        {/* Borrow Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5 font-medium">Select Loan Size (GD):</label>
            <div className="grid grid-cols-3 gap-2">
              {[2000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBorrowAmount(amt)}
                  className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                    borrowAmount === amt
                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                      : "bg-[#141b2e] border-bazaar-border text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {amt} GD
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBorrow}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" /> Take Loan
            </button>
            {currentDebt > 0 && (
              <button
                onClick={handleRepay}
                className="flex-1 py-3 bg-[#1e293b] hover:bg-gray-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Repay Full
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
