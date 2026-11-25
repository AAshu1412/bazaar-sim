import React, { useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap, Loader2, AlertTriangle } from "lucide-react";
import { gameChain } from "../solana/gameChain";

/** Wallet connection + session status. The wallet is asked to sign once (the session); nothing after that. */
export const WalletChip: React.FC = () => {
  const { connected } = useWallet();
  const s = useSyncExternalStore(gameChain.subscribe, gameChain.getState);

  return (
    <div className="flex items-center gap-1.5">
      {connected && s.phase === "live" && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 bg-[#120f0d] border border-emerald-500/40 rounded-xl text-xs font-mono"
          title={`On-chain via session key ${gameChain.sessionAddress ?? ""}\nSession fee balance: ${s.sessionSol.toFixed(3)} SOL`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-300 font-bold">{s.gd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GD</span>
        </div>
      )}
      {connected && (s.phase === "connecting" || s.phase === "setting-up") && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#120f0d] border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300" title={s.detail}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden 2xl:inline">{s.detail ?? "Connecting…"}</span>
          <span className="2xl:hidden">Setting up…</span>
        </div>
      )}
      {connected && s.phase === "needs-session" && (
        <button
          onClick={() => gameChain.startSession()}
          title={s.detail}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/60 rounded-xl text-xs font-bold animate-pulse"
        >
          <Zap className="w-3.5 h-3.5" /> Start session (1 approval)
        </button>
      )}
      {connected && s.phase === "error" && (
        <button
          onClick={() => gameChain.startSession()}
          title={s.detail}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/50 rounded-xl text-xs font-bold"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Retry
        </button>
      )}
      <WalletMultiButton />
    </div>
  );
};
