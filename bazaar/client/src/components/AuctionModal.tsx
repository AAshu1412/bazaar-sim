import React, { useState, useEffect, useSyncExternalStore } from "react";
import { Loader2, Trophy } from "lucide-react";
import { Modal, PanelHead } from "./ui";
import { useGameStore } from "../store/gameStore";
import { gameChain, type AuctionOutcome } from "../solana/gameChain";
import { sfx } from "../audio/sfx";
import { InteriorBanner } from "./InteriorBanner";
import { landmarkInterior } from "../engine/buildingRegistry";

const LOT_UNITS = 100;
const STOCK_CAP = 200;

/**
 * Wholesale auction on the Ephemeral Rollup: MagicBlock VRF draws three rival bids after yours is locked in, the
 * highest bid wins, a winner pays their own bid in GD and the stock is added to the player's shop.
 */
export const AuctionModal: React.FC = () => {
  const auctionActive = useGameStore((s) => s.auctionActive);
  const chain = useSyncExternalStore(gameChain.subscribe, gameChain.getState);
  const live = chain.phase === "live";

  const fairGd = (LOT_UNITS * chain.unitCostCents) / 100; // wholesale value of the lot
  const [bidInput, setBidInput] = useState<number>(Math.round(fairGd * 0.95));
  const [phase, setPhase] = useState<"BIDDING" | "SEALED" | "REVEAL" | "RESULT">("BIDDING");
  const [revealed, setRevealed] = useState<number>(0); // how many of the 4 tiles are uncovered
  const [outcome, setOutcome] = useState<AuctionOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = ["You", "Rival A", "Rival B", "Rival C"];
  const full = chain.inventory + LOT_UNITS > STOCK_CAP * (chain.upgrades & 2 ? 2 : 1);
  const canBid = live && chain.erMode && !full && bidInput >= 1 && bidInput <= chain.gd;

  useEffect(() => {
    if (!auctionActive) { setPhase("BIDDING"); setOutcome(null); setError(null); setRevealed(0); }
  }, [auctionActive]);

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

  const gd = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const cap = STOCK_CAP * (chain.upgrades & 2 ? 2 : 1);
  const blocked = !live ? "Connect your wallet and start a session to bid."
    : !chain.erMode ? "Auctions run on the Ephemeral Rollup, which is not active right now."
    : full ? `Your shelves can't hold another ${LOT_UNITS} units yet. Sell some stock first.` : null;

  return (
    <Modal label="Wholesale auction" onClose={handleClose}>
      <PanelHead icon="gavel" title="Wholesale auction" sub={`Win ${LOT_UNITS} units of stock · rivals drawn by MagicBlock VRF`} onClose={handleClose} />
      <div className="space-y-4 overflow-y-auto p-4">
        <InteriorBanner src={landmarkInterior("town-hall")} alt="Auction hall" className="!aspect-[3/1]" />

        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Lot is worth", `${gd(fairGd)} GD`],
            ["Your GD", live ? gd(chain.gd) : "—"],
            ["Your stock", live ? `${chain.inventory} / ${cap}` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="well px-2 py-1.5">
              <dt className="text-xs font-extrabold text-soft">{k}</dt>
              <dd className="font-display text-base font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {blocked && phase === "BIDDING" && <p className="rounded-xl border-2 border-ink bg-gold/60 p-3 text-sm font-bold">{blocked}</p>}
        {error && <p role="alert" className="rounded-xl border-2 border-ink bg-berry p-3 text-sm font-bold text-paper">{error}</p>}

        {phase === "BIDDING" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="bid" className="flex items-baseline justify-between text-sm font-extrabold">
              Your bid <span className="text-xs font-bold text-soft">Rivals bid 60–119% of the lot's worth</span>
            </label>
            <div className="well flex items-center gap-2 px-3 focus-within:border-ink">
              <input
                id="bid" type="number" inputMode="decimal" autoComplete="off" min={1} max={Math.max(1, Math.floor(chain.gd))} value={bidInput}
                onChange={(e) => setBidInput(Number(e.target.value))}
                className="h-14 w-full bg-transparent font-display text-3xl font-bold tabular-nums"
              />
              <span className="font-display font-semibold text-soft">GD</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.7, 0.9, 1.0, 1.2].map((k) => (
                <button type="button" key={k} className="btn !px-0" onClick={() => { setBidInput(Math.round(fairGd * k)); sfx.playPriceClick(); }}>
                  {Math.round(k * 100)}%
                </button>
              ))}
            </div>
            <button type="submit" disabled={!canBid} className="btn btn-leaf !h-12 w-full !text-base">Place bid</button>
            <p className="text-xs font-semibold text-soft">Highest bid wins, ties go to rivals. You pay only if you win. Bids are public on the rollup.</p>
          </form>
        )}

        {phase !== "BIDDING" && (
          <div className="space-y-3">
            <ol className="grid grid-cols-2 gap-3">
              {names.map((name, idx) => {
                const shown = revealed > idx && outcome;
                const isWinner = phase === "RESULT" && winnerIdx === idx;
                return (
                  <li key={idx} className={`rounded-xl border-2 border-ink p-3 text-center transition-colors ${isWinner ? "bg-gold" : "bg-parchment"}`}>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold">{name}{isWinner && <Trophy className="h-4 w-4" aria-label="Winner" />}</div>
                    <div className={`mt-1 font-display text-xl font-bold tabular-nums ${shown ? "animate-pop" : "text-soft"}`}>
                      {shown ? `${gd(amounts[idx])} GD` : "? ? ?"}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div role="status" className="min-h-[44px] text-center text-sm font-bold">
              {phase === "SEALED" && <p className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Bid locked in. Waiting for randomness…</p>}
              {phase === "REVEAL" && <p>Opening the bids…</p>}
              {phase === "RESULT" && outcome && (outcome.won ? (
                <>
                  <p className="font-display text-lg font-semibold text-leaf">You won! Paid {gd(outcome.bidGd)} GD</p>
                  <p>+{outcome.units} units on your shelves (stock now {chain.inventory})</p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-berry">Outbid at {gd(topRival)} GD</p>
                  <p>Your bid was returned.</p>
                </>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="btn">Close</button>
              {phase === "RESULT" && <button type="button" onClick={bidAgain} className="btn btn-gold">Bid again</button>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
