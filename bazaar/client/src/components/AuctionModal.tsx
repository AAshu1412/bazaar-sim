import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Sparkles, Trophy, X, Package, Shield, Clock } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { landmarkInterior } from "../engine/buildingRegistry";

const GLYPHS = "0123456789ABCDEF$#@%&*ΞΨΩ§";

function getRandomGlyphBlob(): string {
  let res = "";
  for (let i = 0; i < 6; i++) {
    res += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return res;
}

export const AuctionModal: React.FC = () => {
  const {
    auctionActive,
    auctionId,
    auctionTargetInventory,
    stalls,
    localPlayerIndex,
    submitAuctionBid,
    addLedgerItem,
  } = useGameStore();

  const myStall = stalls[localPlayerIndex];
  const [bidInput, setBidInput] = useState<number>(500);
  const [phase, setPhase] = useState<"BIDDING" | "SEALED" | "REVEAL_CASCADE" | "WINNER_ANNOUNCED">("BIDDING");
  const [timer, setTimer] = useState<number>(10);
  const [scrambleBlobs, setScrambleBlobs] = useState<string[]>(["******", "******", "******", "******"]);
  const [revealedBids, setRevealedBids] = useState<{ idx: number; amount: number }[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const handleClose = () => {
    useGameStore.setState({ auctionActive: false });
    sfx.playPriceClick();
  };

  // 10-second cinematic sequence
  useEffect(() => {
    if (!auctionActive) {
      setPhase("BIDDING");
      setTimer(10);
      setRevealedBids([]);
      setWinnerIdx(null);
      return;
    }

    // Timer countdown 10s down to 0
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Rapid glyph scramble animation during sealed stage (0-8s)
    const scrambler = setInterval(() => {
      setScrambleBlobs([
        getRandomGlyphBlob(),
        getRandomGlyphBlob(),
        getRandomGlyphBlob(),
        getRandomGlyphBlob(),
      ]);
      sfx.playGlitch();
    }, 110);

    // Timeline transitions:
    // 7.8s: Reveal cascade begins
    const cascadeTimeout = setTimeout(() => {
      clearInterval(scrambler);
      setPhase("REVEAL_CASCADE");

      const botBids = [
        bidInput, // player
        Math.floor(stalls[1].gdBalance * 0.12),
        Math.floor(stalls[2].gdBalance * 0.18),
        Math.floor(stalls[3].gdBalance * 0.28),
      ];

      botBids.forEach((bid, idx) => {
        setTimeout(() => {
          sfx.playPriceClick();
          setRevealedBids((prev) => [...prev, { idx, amount: bid }]);
        }, idx * 300);
      });
    }, 7800);

    // 9.4s: Announce winner
    const winnerTimeout = setTimeout(() => {
      setPhase("WINNER_ANNOUNCED");
      sfx.playGavel();

      const botBids = [
        bidInput,
        Math.floor(stalls[1].gdBalance * 0.12),
        Math.floor(stalls[2].gdBalance * 0.18),
        Math.floor(stalls[3].gdBalance * 0.28),
      ];
      const maxBid = Math.max(...botBids);
      const wIdx = botBids.indexOf(maxBid);
      setWinnerIdx(wIdx);

      addLedgerItem({
        type: "AUCTION",
        message: `Auction #${auctionId} won by ${stalls[wIdx].name} with ${maxBid} GD (+100 Stock)`,
        signature: "5mX8p...tdxSealed",
        latencyMs: 14,
        network: "PER",
      });
    }, 9400);

    return () => {
      clearInterval(countdown);
      clearInterval(scrambler);
      clearTimeout(cascadeTimeout);
      clearTimeout(winnerTimeout);
    };
  }, [auctionActive, bidInput, auctionId]);

  if (!auctionActive) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitAuctionBid(bidInput);
    setPhase("SEALED");
    addLedgerItem({
      type: "AUCTION",
      message: `Encrypted bid of ${bidInput} GD submitted into TDX enclave`,
      signature: "3vH9b...perEncrypted",
      latencyMs: 18,
      network: "PER",
    });
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
        onClick={(e) => {
          // Allow closing if clicked directly on background backdrop
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-lg bg-[#0e1424] border border-[#232f48] rounded-2xl p-6 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Ambient Glow Banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/50" />

          {/* Close Button in Top Right */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all active:scale-90 z-20"
            title="Dismiss Auction Popup"
          >
            <X className="w-5 h-5" />
          </button>

          <InteriorBanner src={landmarkInterior("town-hall")} alt="Auction hall interior" className="mb-4" />

          {/* Title & Badge */}
          <div className="flex items-center justify-between mb-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40 shadow-inner">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  Supply Shipment #{auctionId}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                    TDX SEALED
                  </span>
                </h3>
                <p className="text-xs text-indigo-300 font-mono flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Private Ephemeral Rollup • First-Price Auction
                </p>
              </div>
            </div>

            {/* Countdown timer badge */}
            <div className="flex items-center gap-1.5 bg-[#141b2e] px-3 py-1.5 rounded-xl border border-bazaar-border shadow-inner">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="font-mono font-black text-amber-400 text-base">
                {timer}s
              </span>
            </div>
          </div>

          {/* Cargo Details Card */}
          <div className="mb-4 bg-[#141c2f] p-3.5 rounded-xl border border-bazaar-border text-xs text-gray-300 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span>Target Cargo: <b className="text-white">+{auctionTargetInventory} Units Coffee Beans</b></span>
            </div>
            <div className="font-mono">
              <span className="text-gray-400">Balance: </span>
              <b className="text-emerald-400 font-bold">{myStall.gdBalance} GD</b>
            </div>
          </div>

          {/* Bid Submission Stage (0 - 3s) */}
          {phase === "BIDDING" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-400">
                  <span>Enter Secret Sealed Bid (GD):</span>
                  <span className="text-indigo-400 font-mono">Min: 10 GD</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={myStall.gdBalance}
                    value={bidInput}
                    onChange={(e) => setBidInput(Number(e.target.value))}
                    className="w-full bg-[#080d19] border border-[#2a3858] rounded-xl px-4 py-3 font-mono font-black text-xl text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-black text-gray-400 font-mono">
                    GD
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2">
                {[100, 250, 500, 1000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => {
                      setBidInput(preset);
                      sfx.playPriceClick();
                    }}
                    className="flex-1 py-1.5 text-xs font-mono font-bold bg-[#141c2e] hover:bg-[#202c46] border border-bazaar-border/60 rounded-lg text-gray-300 transition-all active:scale-95"
                  >
                    {preset} GD
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2 active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                Encrypt & Submit into Private ER
              </button>
            </form>
          )}

          {/* Sealed / Scramble / Reveal Grid */}
          {phase !== "BIDDING" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {stalls.map((stall, idx) => {
                  const revealed = revealedBids.find((r) => r.idx === idx);
                  const isWinner = winnerIdx === idx;

                  return (
                    <motion.div
                      key={idx}
                      layout
                      className={`p-3.5 rounded-xl border transition-all ${
                        isWinner
                          ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20"
                          : "bg-[#0a0f1d] border-bazaar-border"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-black text-gray-200 truncate">
                          {stall.name}
                        </span>
                        {isWinner && <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />}
                      </div>

                      <div className="font-mono text-center py-2 text-base">
                        {revealed ? (
                          <motion.span
                            initial={{ scale: 1.4, color: "#10B981" }}
                            animate={{ scale: 1, color: isWinner ? "#F59E0B" : "#F3F4F6" }}
                            className="font-black"
                          >
                            {revealed.amount} GD
                          </motion.span>
                        ) : (
                          <span className="text-indigo-400 font-black tracking-widest animate-pulse font-mono text-sm">
                            {scrambleBlobs[idx]}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Status Message */}
              <div className="text-center py-2.5">
                {phase === "SEALED" && (
                  <p className="text-xs text-indigo-300 flex items-center justify-center gap-1.5 font-medium">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                    Bids TDX-sealed inside Private ER. Opponents cannot front-run or snipe!
                  </p>
                )}
                {phase === "REVEAL_CASCADE" && (
                  <p className="text-xs text-emerald-400 font-black tracking-wide animate-pulse">
                    Decrypting and resolving enclave sealed bids...
                  </p>
                )}
                {phase === "WINNER_ANNOUNCED" && winnerIdx !== null && (
                  <div className="text-xs font-black text-amber-400 flex items-center justify-center gap-1.5">
                    🎉 <span>{stalls[winnerIdx].name} WON the auction! (+100 Stock)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 bg-[#141b2e] hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-lg border border-bazaar-border transition-all"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
