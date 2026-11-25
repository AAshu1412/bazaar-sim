import React, { useState } from "react";
import { ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { useGameStore, LedgerItem } from "../store/gameStore";
import { ER_RPC_URL } from "../solana/router";
import { Badge } from "./ui";

const explorer = (item: LedgerItem) =>
  `https://explorer.solana.com/tx/${item.signature}?${item.network === "ER" ? `cluster=custom&customUrl=${encodeURIComponent(ER_RPC_URL)}` : "cluster=devnet"}`;

const Row: React.FC<{ item: LedgerItem }> = ({ item }) => {
  const real = item.signature.length > 40;
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-xs">
      {real && (
        <span className={`shrink-0 whitespace-nowrap rounded-md border-2 border-ink px-1.5 py-0.5 font-display font-semibold ${item.network === "ER" ? "bg-sky text-paper" : "bg-gold"}`}>
          {item.network === "ER" ? "Rollup" : "Devnet"}{item.latencyMs ? ` ${item.latencyMs}ms` : ""}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-bold" title={`${item.time} · ${item.message}`}>{item.message}</span>
      {real && (
        <a href={explorer(item)} target="_blank" rel="noreferrer" aria-label="View transaction in the explorer" className="shrink-0 rounded p-1 text-sky hover:bg-ink/10">
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
    </li>
  );
};

/** Activity feed: one line by default, the full list on demand. */
export const CityLedger: React.FC = () => {
  const [open, setOpen] = useState(false);
  const items = useGameStore((s) => s.cityLedger);

  return (
    <section aria-label="Activity" className="panel w-[400px] max-w-[calc(100vw-2rem)]">
      {open && (
        <ul className="max-h-60 divide-y-2 divide-ink/10 overflow-y-auto border-b-[3px] border-ink">
          {items.map((item) => <Row key={item.id} item={item} />)}
        </ul>
      )}
      <div className="flex items-center gap-2 pl-2">
        <Badge icon="coin" size={28} />
        {open ? (
          <h2 className="flex-1 font-display text-sm font-semibold">Activity</h2>
        ) : (
          <ul className="min-w-0 flex-1" aria-live="polite">{items[0] ? <Row item={items[0]} /> : <li className="px-3 py-2 text-xs font-bold text-soft">Nothing yet.</li>}</ul>
        )}
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Hide activity" : "Show all activity"} className="m-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-ink/10">
          {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </section>
  );
};
