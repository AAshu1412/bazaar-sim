import React, { useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap, Loader2, AlertTriangle, ArrowDownToLine } from "lucide-react";
import { gameChain } from "../solana/gameChain";

/** Wallet connection + session status. The wallet is asked to sign once (the session); nothing after that. */
export const WalletChip: React.FC = () => {
  const { connected } = useWallet();
  const s = useSyncExternalStore(gameChain.subscribe, gameChain.getState);

  const problem = connected && (s.phase === "needs-session" || s.phase === "error") ? s.detail : undefined;
  return (
    <div className="relative flex items-center gap-2">
      {problem && (
        <p role="status" className="panel absolute right-0 top-full z-50 mt-3 w-80 whitespace-normal p-3 text-xs font-bold leading-snug">{problem}</p>
      )}
      {connected && s.phase === "live" && s.erMode && (
        <button
          onClick={() => gameChain.settle()}
          disabled={s.settling}
          title={`Bring the shop back to devnet and pay your GD into your token account, then rejoin the rollup. This session's net: ${s.unsettledGd >= 0 ? "+" : ""}${s.unsettledGd.toFixed(2)} GD`}
          className="btn"
        >
          {s.settling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownToLine className="h-4 w-4" aria-hidden />}
          {s.settling ? "Settling…" : "Settle"}
        </button>
      )}
      {connected && (s.phase === "connecting" || s.phase === "setting-up") && (
        <div role="status" className="btn cursor-default" title={s.detail}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Setting up…
        </div>
      )}
      {connected && s.phase === "needs-session" && (
        <button onClick={() => gameChain.startSession()} title={s.detail} className="btn btn-leaf">
          <Zap className="h-4 w-4" aria-hidden /> Start session
        </button>
      )}
      {connected && s.phase === "error" && (
        <button onClick={() => gameChain.startSession()} title={s.detail} className="btn !bg-berry !text-paper">
          <AlertTriangle className="h-4 w-4" aria-hidden /> Retry
        </button>
      )}
      <WalletMultiButton />
    </div>
  );
};
