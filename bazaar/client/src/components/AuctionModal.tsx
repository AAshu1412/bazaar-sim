import React, { useState, useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Sparkles, Trophy, X, Package, Shield, Wallet } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { gameChain, type AuctionOutcome } from "../solana/gameChain";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { landmarkInterior } from "../engine/buildingRegistry";

const GLYPHS = "0123456789ABCDEF$#@%&*ΞΨΩ§";
const blob = () => Array.from({ length: 6 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");
const LOT_UNITS = 100;
const STOCK_CAP = 200;

/**
 * Wholesale auction, refereed by the program: three rival bids are derived on-chain, the highest bid wins,
 * a winner pays their own bid in GD and the stock is added to the player's shop.
 */
export const AuctionModal: React.FC = () => {
  const { auctionActive, stalls } = useGameStore();
  const chain = useSyncExternalStore(gameChain.subscribe, gameChain.getState);
  const live = chain.phase === "live";

  const fairGd = (LOT_UNITS * chain.unitCostCents) / 100; // wholesale value of the lot
  const [bidInput, setBidInput] = useState<number>(Math.round(fairGd * 0.95));
  const [phase, setPhase] = useState<"BIDDING" | "SEALED" | "REVEAL" | "RESULT">("BIDDING");
  const [scramble, setScramble] = useState<string[]>(["******", "******", "******", "******"]);
  const [revealed, setRevealed] = useState<number>(0); // how many of the 4 tiles are uncovered
  const [outcome, setOutcome] = useState<AuctionOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = ["You", stalls[1]?.name ?? "Bot 1", stalls[2]?.name ?? "Bot 2", stalls[3]?.name ?? "Bot 3"];
  const full = chain.inventory + LOT_UNITS > STOCK_CAP * (chain.upgrades & 2 ? 2 : 1);
  const canBid = live && !full && bidInput >= 1 && bidInput <= chain.gd;

  useEffect(() => {
    if (!auctionActive) { setPhase("BIDDING"); setOutcome(null); setError(null); setRevealed(0); }
  }, [auctionActive]);

  // encrypted-looking glyphs while the bid is being sealed on-chain
  useEffect(() => {
    if (phase !== "SEALED") return;
    const id = setInterval(() => { setScramble([blob(), blob(), blob(), blob()]); sfx.playGlitch(); }, 110);
    return () => clearInterval(id);
  }, [phase]);

  const handleClose = () => { useGameStore.setState({ auctionActive: false }); sfx.playPriceClick(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBid) return;
    setError(null);
    setPhase("SEALED");
    try {
      const result = await gameChain.auctionBid(bidInput, LOT_UNITS);
      setOutcome(result);
      setPhase("REVEAL");
      for (let i = 1; i <= 4; i++) {
        await new Promise((r) => setTimeout(r, 350));
        sfx.playPriceClick();
        setRevealed(i);
      }
      await new Promise((r) => setTimeout(r, 400));
      setPhase("RESULT");
      result.won ? sfx.playChing() : sfx.playGavel();
    } catch (err) {
      setError(String((err as { message?: string })?.message ?? err).slice(0, 140));
      setPhase("BIDDING");
    }
  };

  const bidAgain = () => { setPhase("BIDDING"); setOutcome(null); setRevealed(0); setError(null); };

  if (!auctionActive) return null;

  const amounts = outcome ? [outcome.bidGd, ...outcome.rivalsGd] : [];
  const topRival = outcome ? Math.max(...outcome.rivalsGd) : 0;
  const winnerIdx = outcome ? (outcome.won ? 0 : 1 + outcome.rivalsGd.indexOf(topRival)) : null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 25 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#0e1424] border border-[#232f48] rounded-2xl p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/50" />

          <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all active:scale-90 z-20" title="Close">
            <X className="w-5 h-5" />
          </button>

          <InteriorBanner src={landmarkInterior("town-hall")} alt="Auction hall interior" className="mb-4" />

          <div className="flex items-center gap-3 mb-4 pr-8">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                Wholesale Auction
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">ON-CHAIN</span>
              </h3>
              <p className="text-xs text-indigo-300 font-mono flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Sealed first-price bid • win it and your shop restocks
              </p>
            </div>
          </div>

          <div className="mb-4 bg-[#141c2f] p-3.5 rounded-xl border border-bazaar-border text-xs text-gray-300 space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" /> Lot: <b className="text-white">+{LOT_UNITS} units of stock</b></span>
              <span className="font-mono"><span className="text-gray-400">Balance: </span><b className="text-emerald-400">{live ? chain.gd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"} GD</b></span>
            </div>
            <div className="flex justify-between font-mono text-[11px] text-gray-400">
              <span>Wholesale value (restock price): <b className="text-gray-200">{fairGd.toFixed(2)} GD</b></span>
              <span>Your stock: <b className="text-gray-200">{live ? chain.inventory : "—"}</b> / {STOCK_CAP * (chain.upgrades & 2 ? 2 : 1)}</span>
            </div>
          </div>

          {!live && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              <Wallet className="w-4 h-4 shrink-0" /> Connect your wallet and start a session to bid with real GD.
            </div>
          )}
          {live && full && phase === "BIDDING" && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">Your warehouse can't hold another {LOT_UNITS} units yet. Sell some stock first.</div>
          )}
          {error && <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

          {phase === "BIDDING" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium text-gray-400">
                  <span>Your sealed bid (GD):</span>
                  <span className="text-indigo-400 font-mono">Rivals bid 60–119% of {fairGd.toFixed(0)} GD</span>
                </div>
                <div className="relative">
                  <input
                    type="number" min={1} max={Math.max(1, Math.floor(chain.gd))} value={bidInput}
                    onChange={(e) => setBidInput(Number(e.target.value))}
                    className="w-full bg-[#080d19] border border-[#2a3858] rounded-xl px-4 py-3 font-mono font-black text-xl text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-black text-gray-400 font-mono">GD</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[0.7, 0.9, 1.0, 1.15].map((k) => (
                  <button
                    type="button" key={k}
                    onClick={() => { setBidInput(Math.round(fairGd * k)); sfx.playPriceClick(); }}
                    className="flex-1 py-1.5 text-xs font-mono font-bold bg-[#141c2e] hover:bg-[#202c46] border border-bazaar-border/60 rounded-lg text-gray-300 transition-all active:scale-95"
                  >
                    {Math.round(k * 100)}%
                  </button>
                ))}
              </div>
              <button
                type="submit" disabled={!canBid}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Place sealed bid on-chain
              </button>
            </form>
          )}

          {phase !== "BIDDING" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {names.map((name, idx) => {
                  const shown = revealed > idx && outcome;
                  const isWinner = phase === "RESULT" && winnerIdx === idx;
                  return (
                    <motion.div
                      key={idx} layout
                      className={`p-3.5 rounded-xl border transition-all ${isWinner ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20" : "bg-[#0a0f1d] border-bazaar-border"}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-black text-gray-200 truncate">{name}</span>
                        {isWinner && <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />}
                      </div>
                      <div className="font-mono text-center py-2 text-base">
                        {shown ? (
                          <motion.span initial={{ scale: 1.4, color: "#10B981" }} animate={{ scale: 1, color: isWinner ? "#F59E0B" : "#F3F4F6" }} className="font-black">
                            {amounts[idx].toLocaleString(undefined, { maximumFractionDigits: 2 })} GD
                          </motion.span>
                        ) : (
                          <span className="text-indigo-400 font-black tracking-widest animate-pulse font-mono text-sm">{scramble[idx]}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center py-2.5 text-xs">
                {phase === "SEALED" && (
                  <p className="text-indigo-300 flex items-center justify-center gap-1.5 font-medium">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-400" /> Sealing your bid on-chain…
                  </p>
                )}
                {phase === "REVEAL" && <p className="text-emerald-400 font-black tracking-wide animate-pulse">Opening the sealed bids…</p>}
                {phase === "RESULT" && outcome && (
                  outcome.won ? (
                    <div className="font-black text-amber-300 space-y-1">
                      <div>🎉 You won! Paid {outcome.bidGd.toLocaleString(undefined, { maximumFractionDigits: 2 })} GD</div>
                      <div className="text-emerald-300 font-bold">+{outcome.units} units added to your shop (stock now {chain.inventory})</div>
                    </div>
                  ) : (
                    <div className="font-bold text-gray-300 space-y-1">
                      <div>Outbid. The top rival bid {topRival.toLocaleString(undefined, { maximumFractionDigits: 2 })} GD.</div>
                      <div className="text-gray-400 font-normal">No GD was spent.</div>
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {phase === "RESULT" && (
                  <button type="button" onClick={bidAgain} className="px-4 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all">
                    Bid in a new auction
                  </button>
                )}
                <button type="button" onClick={handleClose} className="px-4 py-1.5 bg-[#141b2e] hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-lg border border-bazaar-border transition-all">
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
