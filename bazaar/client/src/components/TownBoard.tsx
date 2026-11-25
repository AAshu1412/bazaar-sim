import React, { useState } from "react";
import type { PlotInfo } from "../engine/IsometricEngineV3";
import { PLACES, shopKind, price, type PlaceId } from "../engine/shopKinds";
import { Badge, Modal, PanelHead } from "./ui";

/** What is what in town: every shop ranked by price, and every public building. Pick a row to go there. */
export const TownBoard: React.FC<{
  shops: PlotInfo[];
  onClose: () => void;
  onShop: (id: number) => void;
  onPlace: (id: PlaceId) => void;
}> = ({ shops, onClose, onShop, onPlace }) => {
  const [tab, setTab] = useState<"shops" | "places">("shops");
  const ranked = [...shops].sort((a, b) => Number(a.inventory === 0) - Number(b.inventory === 0) || a.priceCents - b.priceCents);

  return (
    <Modal label="Town board" onClose={onClose} className="max-w-xl">
      <PanelHead icon="pin" title="Town board" sub="Who sells what, and where to go" onClose={onClose} />
      <div role="tablist" aria-label="Town board sections" className="flex gap-2 px-4 pt-3">
        {(["shops", "places"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn ${tab === t ? "btn-gold" : ""}`}>
            {t === "shops" ? "Price board" : "Places"}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="overflow-y-auto p-4">
        {tab === "shops" ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-soft">
              <tr><th scope="col" className="pb-2 font-extrabold">Shop (cheapest first)</th><th scope="col" className="pb-2 text-right font-extrabold">Price</th><th scope="col" className="pb-2 text-right font-extrabold">Stock</th><th scope="col" className="pb-2 text-right font-extrabold" title="Sales seen since you opened the game">Sales</th></tr>
            </thead>
            <tbody>
              {ranked.map((p) => {
                const mine = p.ownerType === "player", kind = shopKind(p.businessType);
                return (
                  <tr key={p.id} className={`border-t-2 border-ink/10 ${mine ? "bg-gold/50" : ""}`}>
                    <th scope="row" className="py-1 font-normal">
                      <button onClick={() => onShop(p.id)} className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-ink/10">
                        <Badge icon={kind.icon} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate font-extrabold">{mine ? "Corner Roast (you)" : kind.name}</span>
                          <span className="block truncate text-xs font-bold text-soft">{mine ? kind.name : p.owner}</span>
                        </span>
                      </button>
                    </th>
                    <td className="text-right font-display text-base font-semibold tabular-nums">{price(p.priceCents)}</td>
                    <td className={`text-right font-bold tabular-nums ${p.inventory === 0 ? "text-berry" : ""}`}>{p.inventory || "Out"}</td>
                    <td className="pr-1 text-right font-bold tabular-nums">{p.customersServed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLACES.map((pl) => (
              <li key={pl.id}>
                <button onClick={() => onPlace(pl.id)} disabled={pl.soon} className="well flex w-full items-center gap-3 p-3 text-left enabled:hover:bg-gold/60 disabled:cursor-not-allowed disabled:opacity-55 disabled:grayscale">
                  <Badge icon={pl.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold">{pl.name}</span>
                    <span className="block text-xs font-bold text-soft">{pl.does}</span>
                  </span>
                  {pl.soon && <span className="soon">soon</span>}
                </button>
              </li>
            ))}
            <li className="sm:col-span-2">
              <div className="well flex items-center gap-3 p-3 opacity-55 grayscale">
                <Badge icon="people" />
                <span className="flex-1"><span className="block font-display font-semibold">Multiplayer world</span><span className="block text-xs font-bold text-soft">Share a town with other players</span></span>
                <span className="soon">soon</span>
              </div>
            </li>
          </ul>
        )}
      </div>
    </Modal>
  );
};
