import React, { useState, useSyncExternalStore } from "react";
import { Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { onChainService } from "../solana/onChainService";

const LABEL = {
  connecting: { dot: "bg-gray-400 animate-pulse", text: "Connecting…" },
  unfunded: { dot: "bg-amber-400 animate-pulse", text: "Fund wallet" },
  live: { dot: "bg-emerald-400", text: "Devnet live" },
  error: { dot: "bg-red-400", text: "Simulated" },
} as const;

/** Burner-wallet status for the on-chain layer: click to copy the address; unfunded shows the faucet link. */
export const WalletChip: React.FC = () => {
  const s = useSyncExternalStore(onChainService.subscribe, onChainService.getStatus);
  const [copied, setCopied] = useState(false);
  const { dot, text } = LABEL[s.state];
  const short = `${s.address.slice(0, 4)}…${s.address.slice(-4)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(s.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={copy}
        title={`${s.address}\n${s.detail ?? "Click to copy address"}`}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#120f0d] border border-[#d4a359]/20 hover:border-[#d4a359]/50 rounded-xl text-xs font-mono transition-colors"
      >
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <Wallet className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-200 font-bold">{text}</span>
        <span className="hidden 2xl:inline text-gray-500">{short}</span>
        {s.state === "live" && <span className="text-emerald-400">{s.balanceSol.toFixed(3)} SOL</span>}
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
      </button>
      {s.state === "unfunded" && (
        <a
          href="https://faucet.solana.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold"
          title="Send ~0.05 devnet SOL to the copied address"
        >
          Faucet <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
