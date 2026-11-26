import React, { useState } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";
import type { PlotInfo } from "../engine/IsometricEngineV3";
import { InteriorBanner } from "./InteriorBanner";
import { interiorFor } from "../engine/buildingRegistry";
import { shopKind, price } from "../engine/shopKinds";
import { Meter, PanelHead } from "./ui";

const TIERS = { Corner: "Corner plot", MainStreet: "Main Street", SideStreet: "Side Street", Alley: "Alley" } as const;
export const MIN_PRICE = 100, MAX_PRICE = 600;
export const RESTOCK_UNITS = 20;

interface Props {
  plot: PlotInfo;
  /** the other shops with stock, cheapest first */
  rivals: PlotInfo[];
  myPriceCents: number;
  /** your GD (wallet balance when playing on-chain, practice coins otherwise) */
  gd: number;
  restockCostGd: number;
  stockCap: number;
  /** true when actions are real transactions */
  live: boolean;
  signage: boolean;
  onClose: () => void;
  onReprice: (cents: number) => void;
  onRestock: () => Promise<unknown> | void;
  onUpgrade: () => Promise<unknown> | void;
}

export const PlotInspector: React.FC<Props> = ({ plot, rivals, myPriceCents, gd, restockCostGd, stockCap, live, signage, onClose, onReprice, onRestock, onUpgrade }) => {
  const [busy, setBusy] = useState<"restock" | "upgrade" | null>(null);
  const run = async (id: "restock" | "upgrade", fn: () => Promise<unknown> | void) => {
    if (busy) return;
    setBusy(id);
    try { await fn(); } finally { setBusy(null); }
  };
  const mine = plot.ownerType === "player";
  const empty = plot.ownerType === "unclaimed";
  const kind = shopKind(plot.businessType);
  const cheapest = rivals[0];
  const beaten = rivals.filter((r) => r.priceCents > plot.priceCents).length;
  const gap = plot.priceCents - myPriceCents;
  const full = plot.inventory + RESTOCK_UNITS > stockCap;
  const restockWhy = full ? "Shelves are full" : gd < restockCostGd ? "Not enough GD" : null;

  return (
    <aside aria-label="Shop details" className="panel fixed right-4 top-[92px] z-40 flex max-h-[calc(100vh-176px)] w-[344px] max-w-[calc(100vw-2rem)] animate-pop flex-col">
      <PanelHead
        icon={empty ? "tag" : kind.icon}
        title={empty ? "Empty lot" : mine ? "Corner Roast" : kind.name}
        sub={`${empty ? "For lease" : mine ? "Your shop" : `Run by ${plot.owner}`} · ${TIERS[plot.tier]}`}
        onClose={onClose}
      />
      <div className="space-y-3 overflow-y-auto p-4">
        <InteriorBanner className="[@media(max-height:760px)]:hidden" src={interiorFor(empty ? "Vacant" : plot.businessType, mine ? signage : plot.isUpgraded)} alt={empty ? "Empty lot" : `Inside the ${kind.name.toLowerCase()}`} />

        {empty ? (
          <>
            <p className="text-sm font-semibold text-soft">Nobody trades here yet. Leasing more shops is not built.</p>
            <button className="btn w-full" disabled>Lease this lot <span className="soon">soon</span></button>
          </>
        ) : (
          <>
            <section className="well p-3">
              <div className="flex items-center justify-between gap-2">
                {mine ? (
                  <button className="btn btn-icon" aria-label="Lower price by 5 cents" disabled={plot.priceCents <= MIN_PRICE} onClick={() => onReprice(Math.max(MIN_PRICE, plot.priceCents - 5))}>
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                ) : <span />}
                <div className="text-center">
                  <div className="font-display text-4xl font-bold tabular-nums leading-none">{price(plot.priceCents)}</div>
                  <div className="mt-1 text-xs font-bold text-soft">per sale</div>
                </div>
                {mine ? (
                  <button className="btn btn-icon" aria-label="Raise price by 5 cents" disabled={plot.priceCents >= MAX_PRICE} onClick={() => onReprice(Math.min(MAX_PRICE, plot.priceCents + 5))}>
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                ) : <span />}
              </div>
              {mine ? (
                <>
                  <input type="range" aria-label="Your price" min={MIN_PRICE} max={MAX_PRICE} step={5} value={plot.priceCents} onChange={(e) => onReprice(Number(e.target.value))} className="mt-3 h-2 w-full cursor-pointer accent-wood" />
                  <p className="mt-2 text-center text-xs font-bold">
                    {cheapest ? (
                      <>Cheaper than <span className="text-leaf">{beaten}</span> of {rivals.length} shops. Lowest rival: {price(cheapest.priceCents)}</>
                    ) : "No rival has stock right now."}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-center text-xs font-bold">
                  {gap === 0 ? "Same price as you." : <>{price(Math.abs(gap))} <span className={gap > 0 ? "text-leaf" : "text-berry"}>{gap > 0 ? "more" : "less"}</span> than your shop.</>}
                </p>
              )}
            </section>

            <section className="space-y-1.5">
              <div className="flex justify-between text-sm font-extrabold">
                <span>Stock</span>
                <span className="tabular-nums">{plot.inventory === 0 ? "Sold out" : `${plot.inventory} left`}</span>
              </div>
              <Meter label="Stock" value={plot.inventory} max={mine ? stockCap : plot.maxInventory} />
            </section>

            {mine && (
              <div className="space-y-2 pt-1">
                <button className="btn btn-leaf w-full justify-between" disabled={!!busy || !!restockWhy} onClick={() => run("restock", onRestock)}>
                  <span className="flex items-center gap-2">{busy === "restock" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{busy === "restock" ? "Restocking…" : `Restock +${RESTOCK_UNITS}`}</span>
                  <span className="tabular-nums">{restockWhy ?? `${restockCostGd.toLocaleString(undefined, { maximumFractionDigits: 2 })} GD`}</span>
                </button>
                <button className="btn btn-gold w-full justify-between" disabled={!!busy || signage || !live || gd < 1000} onClick={() => run("upgrade", onUpgrade)}>
                  <span className="flex items-center gap-2">{busy === "upgrade" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{signage ? "Signage installed" : "Put up signage"}</span>
                  {!signage && <span>{!live ? "Needs wallet" : "1,000 GD"}</span>}
                </button>
                <p className="text-xs font-semibold text-soft">{live ? "Signed by your session key. No wallet pop-up." : "Practice mode: nothing is saved on-chain. Connect a wallet to play for real."}</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
