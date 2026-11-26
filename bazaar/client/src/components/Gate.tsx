/** The front door: the story's opening letter, then wallet, session and shop setup. The town plays only after this. */
import React, { useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Check, Loader2, Zap, DoorOpen, AlertTriangle, Clapperboard } from "lucide-react";
import { gameChain } from "../solana/gameChain";
import { useGameStore } from "../store/gameStore";
import { Badge } from "./ui";

/** setup milestones, recognised in the activity feed */
const SETUP: [string, RegExp][] = [
  ["Session key approved", /Session key authorised/],
  ["Town founded and GD minted", /Season created/],
  ["$10,000 in your wallet", /Joined season/],
  ["Corner Roast bought and opened", /Plot claimed/],
  ["Shop moved to the rollup", /Shop delegated/],
  ["Rent collector hired", /Rent is /],
];

const Step: React.FC<{ n: number; title: string; state: "done" | "now" | "later"; children?: React.ReactNode }> = ({ n, title, state, children }) => (
  <li className={`well p-3 ${state === "later" ? "opacity-50" : ""} ${state === "now" ? "!border-ink bg-gold/40" : ""}`}>
    <div className="flex items-center gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink font-display font-semibold ${state === "done" ? "bg-leaf text-paper" : "bg-paper"}`}>
        {state === "done" ? <Check className="h-4 w-4" aria-label="Done" /> : n}
      </span>
      <h2 className="font-display text-base font-semibold">{title}</h2>
    </div>
    {state === "now" && <div className="mt-2 space-y-2 pl-11 text-sm font-bold">{children}</div>}
  </li>
);

export const Gate: React.FC<{ onEnter: () => void; onIntro: () => void }> = ({ onEnter, onIntro }) => {
  const { connected, connecting } = useWallet();
  const s = useSyncExternalStore(gameChain.subscribe, gameChain.getState);
  const feed = useGameStore((g) => g.cityLedger);
  const live = connected && s.phase === "live";
  const needsSession = connected && (s.phase === "needs-session" || s.phase === "error");
  const working = connected && (s.phase === "connecting" || s.phase === "setting-up");
  const reached = SETUP.map(([, re]) => feed.some((i) => re.test(i.message)));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-[3px]">
      <main className="panel my-auto w-full max-w-[920px] animate-pop overflow-hidden md:grid md:grid-cols-[1fr_400px]">
        <section className="flex flex-col items-center gap-4 border-ink bg-wood p-6 text-paper md:border-r-[3px]">
          <img src="/logo/logo.svg" alt="Bazaar" width={300} className="w-[260px] max-w-full" />
          <button className="btn btn-gold" onClick={onIntro}><Clapperboard className="h-4 w-4" aria-hidden /> Watch the intro</button>
          <div className="well w-full !border-ink !bg-paper p-4 text-ink">
            <p className="font-display text-lg font-semibold">A letter, slightly coffee-stained</p>
            <p className="mt-2 text-sm font-bold leading-relaxed">Kid,</p>
            <p className="mt-1 text-sm font-bold leading-relaxed">My knees have retired and so have I. The little corner shop by the fountain is yours if you want it. The town drinks a lot of coffee, Mira next door thinks it should all be hers, and the rent comes every day.</p>
            <p className="mt-2 text-sm font-bold leading-relaxed">Bring your wallet. I'll show you everything.</p>
            <div className="mt-3 flex items-center gap-3"><Badge icon="ravi" size={56} /><p className="font-display font-semibold">Uncle Ravi</p></div>
          </div>
        </section>

        <section className="space-y-3 p-5">
          <p className="font-display text-xl font-semibold">Open your shop</p>
          <ol className="space-y-2">
            <Step n={1} title="Connect your wallet" state={connected ? "done" : "now"}>
              <p>Use a Solana wallet such as Phantom, set to <b>Devnet</b>. Connecting costs nothing.</p>
              <WalletMultiButton />
              {connecting && <p role="status">Waiting for your wallet…</p>}
            </Step>
            <Step n={2} title="Start your session" state={!connected ? "later" : needsSession ? "now" : s.phase === "connecting" && !reached[0] ? "now" : "done"}>
              <p>One approval, then no more pop-ups. A session key that can only play Bazaar signs the rest. It takes 0.04 devnet SOL for fees and lasts 6 days.</p>
              {needsSession && s.detail && <p role="alert" className="flex gap-2 rounded-lg border-2 border-ink bg-paper p-2 text-xs"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />{s.detail}</p>}
              {needsSession ? (
                <button className="btn btn-leaf" onClick={() => gameChain.startSession()}><Zap className="h-4 w-4" aria-hidden /> Start session</button>
              ) : (
                <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{s.detail ?? "Checking your session…"}</p>
              )}
              <p className="text-xs text-soft">No devnet SOL? Get some free at <a className="underline" href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a>.</p>
            </Step>
            <Step n={3} title="Set up Corner Roast" state={live ? "done" : working && (s.phase === "setting-up" || reached[0]) ? "now" : "later"}>
              <ul className="space-y-1" aria-live="polite">
                {SETUP.map(([label], i) => {
                  const done = reached[i], current = !done && i === reached.findIndex((r, k) => k > 0 && !r);
                  return (
                    <li key={label} className={`flex items-center gap-2 text-xs ${done || current ? "" : "text-soft"}`}>
                      {done ? <Check className="h-4 w-4 text-leaf" aria-label="Done" /> : current ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <span className="h-4 w-4 text-center" aria-hidden>·</span>}
                      {label}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-soft">Returning shopkeepers skip the steps already done.</p>
            </Step>
          </ol>
          <button className="btn btn-gold !h-14 w-full !text-lg" disabled={!live} onClick={onEnter}>
            <DoorOpen className="h-5 w-5" aria-hidden /> {live ? "Open the shop doors" : "Complete the steps above"}
          </button>
        </section>
      </main>
    </div>
  );
};
