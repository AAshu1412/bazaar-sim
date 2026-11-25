import React, { useState } from "react";
import { Eye, Shield, Send, CheckCircle, X } from "lucide-react";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { landmarkInterior } from "../engine/buildingRegistry";

interface IntelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntelModal: React.FC<IntelModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<"scout" | "buyout">("scout");
  const [targetPlot, setTargetPlot] = useState<number>(1);
  const [scouted, setScouted] = useState<boolean>(false);
  const [buyoutOfferSent, setBuyoutOfferSent] = useState<boolean>(false);
  const [buyoutAmount, setBuyoutAmount] = useState<number>(6500);

  if (!isOpen) return null;

  const handleHireScout = () => {
    setScouted(true);
    sfx.playPriceClick();
  };

  const handleSendBuyout = () => {
    setBuyoutOfferSent(true);
    sfx.playGavel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#0e1424] border border-[#232f48] rounded-2xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <InteriorBanner src={landmarkInterior("intel-guild")} alt="Intel guild interior" className="mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/40">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Confidential Intel & M&A</h3>
            <p className="text-xs text-indigo-300 font-mono">Private ER (TDX Enclave) Information Broker</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#141b2e] p-1 rounded-xl mb-4 text-xs font-bold font-mono">
          <button
            onClick={() => setTab("scout")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === "scout" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Scouting (500 GD)
          </button>
          <button
            onClick={() => setTab("buyout")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === "buyout" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Sealed Buyout (M&A)
          </button>
        </div>

        {tab === "scout" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              Pay <b>500 GD</b> to deploy a private scout. Decrypts rival's sealed inventory & unit supply cost for 1 day inside your private enclave.
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Target Rival Plot:</label>
              <select
                value={targetPlot}
                onChange={(e) => {
                  setTargetPlot(Number(e.target.value));
                  setScouted(false);
                }}
                className="w-full bg-[#141c2e] border border-bazaar-border rounded-xl px-3 py-2 text-xs text-white font-mono"
              >
                <option value={1}>Plot #1: Main St (Electronics)</option>
                <option value={2}>Plot #2: Side St (Street Food)</option>
                <option value={3}>Plot #3: MagicBlock Blvd (Coffee)</option>
              </select>
            </div>

            {scouted ? (
              <div className="bg-purple-950/40 border border-purple-500/50 rounded-xl p-3.5 text-xs font-mono space-y-1.5 animate-fadeIn">
                <div className="text-purple-300 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  DECRYPTED TDX SCOUT REPORT:
                </div>
                <div className="text-gray-200">Inventory Stock: <b className="text-amber-400">14 Units (Low Stock!)</b></div>
                <div className="text-gray-200">Wholesale Unit Cost: <b className="text-emerald-400">$1.10 (110 GD)</b></div>
                <div className="text-gray-400 text-[10px]">Estimated Profit Margin: +135%</div>
              </div>
            ) : (
              <button
                onClick={handleHireScout}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30"
              >
                Hire Scout (500 GD)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              Send a <b>TDX-sealed M&A buyout offer</b> directly to a plot owner. Only the target sees the offer. Asset transfers atomically on acceptance.
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Offer Amount (GD):</label>
              <input
                type="number"
                value={buyoutAmount}
                onChange={(e) => setBuyoutAmount(Number(e.target.value))}
                className="w-full bg-[#141c2e] border border-bazaar-border rounded-xl px-3 py-2 text-sm font-mono font-bold text-white"
              />
            </div>

            {buyoutOfferSent ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Sealed buyout offer transmitted into target enclave.
              </div>
            ) : (
              <button
                onClick={handleSendBuyout}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Encrypted Offer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
