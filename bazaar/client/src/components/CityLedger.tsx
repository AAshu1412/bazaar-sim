import React, { useState } from "react";
import { ChevronUp, ChevronDown, ExternalLink, Zap } from "lucide-react";
import { useGameStore, LedgerItem } from "../store/gameStore";

export const CityLedger: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const cityLedger = useGameStore((s) => s.cityLedger);

  return (
    <div className="w-full bg-bazaar-surface border-t border-bazaar-border text-xs">
      {/* Ticker Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-bazaar-card/60 border-b border-bazaar-border/50">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-extrabold text-gray-200 tracking-wide uppercase text-[11px]">
            City Ledger Ticker
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
            LIVE TRANSACTIONS
          </span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-bazaar-border transition-colors"
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Ledger List */}
      {!collapsed && (
        <div className="max-h-28 overflow-y-auto divide-y divide-bazaar-border/40 font-mono">
          {cityLedger.map((item: LedgerItem) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-1.5 hover:bg-bazaar-card/40 transition-colors text-[11px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 whitespace-nowrap text-gray-500 text-[10px]">{item.time}</span>
                <span
                  className={`shrink-0 whitespace-nowrap px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                    item.network === "PER"
                      ? "bg-purple-500/20 text-purple-400"
                      : item.network === "ER"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  [{item.network} {item.latencyMs}ms]
                </span>
                <span className="text-gray-200 truncate" title={item.message}>{item.message}</span>
              </div>

              {item.signature.length > 40 ? (
                <a
                  href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 text-gray-400 hover:text-indigo-400 transition-colors"
                >
                  <span>{item.signature.substring(0, 8)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="shrink-0 text-gray-600">{item.signature.substring(0, 8)}...</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
