import React from "react";
import { Trophy, RefreshCw, ExternalLink } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export const ResultsModal: React.FC = () => {
  const { status, stalls, potLamports, resetGame } = useGameStore();

  if (status !== "Ended" && status !== "Settled") return null;

  const totalRevenue = stalls.reduce((sum, s) => sum + s.revenue, 0);
  const potSol = (potLamports / 1e9).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-bazaar-surface border border-bazaar-border rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-2xl mb-2">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Round Settled</h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Settled on-chain via Magic Actions pro-rata pot split
          </p>
        </div>

        {/* Pot Card */}
        <div className="bg-bazaar-card p-4 rounded-xl border border-bazaar-border mb-4 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400">Total Pot</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {potSol} SOL
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">Total Revenue Earned</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {totalRevenue} GD
            </div>
          </div>
        </div>

        {/* Stalls Breakdown */}
        <div className="space-y-2 mb-6 font-mono text-xs">
          {stalls.map((s, idx) => {
            const sharePct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 25;
            const payoutSol = totalRevenue > 0 ? ((s.revenue / totalRevenue) * (potLamports / 1e9)).toFixed(3) : (potLamports / 4 / 1e9).toFixed(3);

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-bazaar-bg rounded-lg border border-bazaar-border"
              >
                <div>
                  <span className="font-bold text-gray-200">{s.name}</span>
                  <div className="text-[10px] text-gray-500">
                    Revenue: {s.revenue} GD ({sharePct.toFixed(1)}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-amber-400">
                    +{payoutSol} SOL
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <a
            href="https://explorer.solana.com/?cluster=devnet"
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 bg-bazaar-card hover:bg-bazaar-border text-gray-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Explorer TX
          </a>
          <button
            onClick={resetGame}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
