/** The opening trailer: the town, the MagicBlock stack under it (live demonstrations), the cast and what is coming. */
import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Check, X, Pause, Play } from "lucide-react";
import { CAST, type Speaker } from "../story/script";
import { sfx } from "../audio/sfx";
import { Badge } from "./ui";

const art = (path: string) => `/assets/${path}.png`;
const rise = (delay = 0) => ({ initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { delay, type: "spring" as const, stiffness: 170, damping: 20 } });
const pop = (delay = 0) => ({ initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, transition: { delay, type: "spring" as const, stiffness: 260, damping: 16 } });
const useEvery = (ms: number) => {
  const [n, setN] = useState(0);
  useEffect(() => { const id = setInterval(() => setN((v) => v + 1), ms); return () => clearInterval(id); }, [ms]);
  return n;
};

const Title: React.FC<{ kicker?: string; children: React.ReactNode }> = ({ kicker, children }) => (
  <motion.div {...rise()} className="text-center">
    {kicker && <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-gold sm:text-sm">{kicker}</p>}
    <h2 className="mx-auto mt-1 max-w-3xl text-balance font-display text-3xl font-bold leading-tight sm:text-5xl">{children}</h2>
  </motion.div>
);
const DoesDoesnt: React.FC<{ does: string; doesnt: string }> = ({ does, doesnt }) => (
  <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
    <motion.p {...rise(0.7)} className="panel flex gap-2 !bg-paper p-3 text-sm font-bold"><Check className="h-5 w-5 shrink-0 text-leaf" aria-label="Does" />{does}</motion.p>
    <motion.p {...rise(0.95)} className="panel flex gap-2 !bg-parchment p-3 text-sm font-bold"><X className="h-5 w-5 shrink-0 text-berry" aria-label="Does not" />{doesnt}</motion.p>
  </div>
);
/** A row of the town's shops along the bottom of a scene. */
const Street: React.FC<{ delay?: number }> = ({ delay = 0.4 }) => (
  <div aria-hidden className="flex w-full items-end justify-center">
    {["shop-flower", "shop-food", "shop-coffee-plus", "shop-book", "shop-tech"].map((n, i) => (
      <motion.img key={n} {...rise(delay + i * 0.12)} src={art(`exterior/${n}`)} alt="" className={`-mx-4 w-[22%] max-w-[230px] sm:-mx-6 ${i === 2 ? "z-10 !w-[28%] !max-w-[290px]" : ""}`} />
    ))}
  </div>
);

// ───────────── live demonstrations ─────────────

/** Real time: one base-layer block every 400 ms, one rollup block every 10 ms. */
const Race = () => {
  const [ms, setMs] = useState(0);
  useEffect(() => { const t0 = performance.now(); const id = setInterval(() => setMs(performance.now() - t0), 50); return () => clearInterval(id); }, []);
  const lanes = [
    { name: "Solana base layer", note: "a block about every 400 ms", n: Math.floor(ms / 400), color: "bg-parchment" },
    { name: "MagicBlock Ephemeral Rollup", note: "a block about every 10 ms (measured on devnet)", n: Math.floor(ms / 10), color: "bg-[#8f72ff]" },
  ];
  return (
    <div className="w-full max-w-3xl space-y-3">
      {lanes.map((l) => (
        <div key={l.name} className="rounded-2xl border-2 border-paper/30 bg-black/30 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div><p className="font-display text-base font-semibold sm:text-lg">{l.name}</p><p className="text-xs font-bold text-paper/70">{l.note}</p></div>
            <p className="font-display text-3xl font-bold tabular-nums sm:text-4xl">{l.n.toLocaleString()}</p>
          </div>
          <div aria-hidden className="mt-2 flex h-6 justify-start gap-[3px] overflow-hidden">
            {Array.from({ length: Math.min(l.n, 70) }, (_, i) => <span key={l.n - i} className={`h-6 w-2.5 shrink-0 rounded-sm ${l.color}`} />)}
          </div>
        </div>
      ))}
    </div>
  );
};

/** A pile of approval windows against a single one. */
const Popups = () => {
  const n = Math.min(useEvery(260), 40);
  const actions = ["Change price", "Sell a coffee", "Restock", "Sell a coffee", "Pay rent", "Place bid"];
  return (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
      <div className="relative h-52 overflow-hidden rounded-2xl border-2 border-paper/30 bg-black/30 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-paper/70">Approve every move</p>
        {Array.from({ length: Math.min(n, 9) }, (_, i) => {
          const k = n - Math.min(n, 9) + i;
          return (
            <motion.div key={k} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel absolute w-44 !bg-paper p-2" style={{ left: 14 + ((k * 53) % 150), top: 34 + ((k * 37) % 100) }}>
              <p className="text-xs font-extrabold">{actions[k % actions.length]}</p>
              <p className="mt-1 rounded-md bg-wood py-1 text-center text-[11px] font-bold text-paper">Approve?</p>
            </motion.div>
          );
        })}
        <p className="absolute bottom-2 right-3 z-10 rounded-lg bg-ink px-2 font-display text-3xl font-bold text-[#ff8a75]">{n} pop-ups</p>
      </div>
      <div className="flex h-52 flex-col items-center justify-center rounded-2xl border-2 border-[#8f72ff] bg-[#8f72ff]/15 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-paper/80">With a session key</p>
        <motion.div {...pop(0.5)} className="panel mt-3 w-52 !bg-gold p-3 text-center">
          <p className="font-display text-lg font-semibold">Approve once</p>
          <p className="text-xs font-bold">then just play</p>
        </motion.div>
        <p className="mt-3 font-display text-3xl font-bold text-gold">1 pop-up</p>
      </div>
    </div>
  );
};

const Bids = () => {
  const tick = useEvery(90);
  return (
    <div className="grid w-full max-w-2xl grid-cols-4 gap-2 sm:gap-3">
      <motion.div {...pop(0.2)} className="panel !bg-gold p-3 text-center"><p className="text-xs font-extrabold">You</p><p className="font-display text-xl font-bold sm:text-3xl">$150</p><p className="text-[11px] font-bold">locked in</p></motion.div>
      {[131.52, 90.42, 153.44].map((final, i) => {
        const settled = tick > 28 + i * 9;
        return (
          <motion.div key={final} {...pop(0.4 + i * 0.15)} className="panel p-3 text-center">
            <p className="text-xs font-extrabold">Rival {"ABC"[i]}</p>
            <p className={`font-display text-xl font-bold tabular-nums sm:text-3xl ${settled ? "" : "text-soft"}`}>${(settled ? final : 82 + ((tick * (37 + i * 11)) % 81)).toFixed(settled ? 2 : 0)}</p>
            <p className="text-[11px] font-bold">{settled ? "drawn" : "drawing…"}</p>
          </motion.div>
        );
      })}
    </div>
  );
};

const Rent = () => {
  const n = useEvery(1300);
  return (
    <div className="flex w-full max-w-2xl items-center justify-between gap-3">
      <div className="text-center"><img src={art("exterior/shop-coffee")} alt="" className="w-36 sm:w-52" /><p className="font-display font-semibold">Your shop</p></div>
      <div className="relative h-24 flex-1">
        <motion.div key={n} initial={{ left: "0%", opacity: 0 }} animate={{ left: "82%", opacity: [0, 1, 1, 0] }} transition={{ duration: 1.2, ease: "easeInOut" }} className="absolute top-3">
          <Badge icon="coin" size={52} />
        </motion.div>
        <p className="absolute inset-x-0 bottom-0 text-center text-xs font-extrabold uppercase tracking-wide text-gold">$20 every game day · scheduler on the rollup</p>
      </div>
      <div className="text-center"><img src={art("exterior/town-hall")} alt="" className="w-36 sm:w-52" /><p className="font-display font-semibold">Town treasury</p></div>
    </div>
  );
};

const Payout = () => (
  <div className="flex w-full max-w-2xl flex-col items-center gap-3 sm:flex-row">
    <motion.div {...pop(0.2)} className="w-full flex-1 rounded-2xl border-2 border-[#8f72ff] bg-[#8f72ff]/15 p-4 text-center"><p className="font-display text-xl font-semibold">Rollup</p><p className="text-sm font-bold">close the books, leave</p></motion.div>
    <motion.div {...pop(0.8)}><ArrowRight className="h-12 w-12 rotate-90 text-gold sm:rotate-0" aria-label="then, in the same move" /></motion.div>
    <motion.div {...pop(1.4)} className="panel w-full flex-1 !bg-gold p-4 text-center"><p className="font-display text-xl font-semibold">Solana</p><p className="text-sm font-bold">your cash lands in your token account</p></motion.div>
  </div>
);

const COMPARE: [string, string, string][] = [
  ["Every price change and sale", "A wallet pop-up each (or your own session system), ~400 ms blocks, a fee each", "One approval, ~10 ms rollup blocks"],
  ["Rent that collects itself", "A server of yours, running forever, holding a key", "A MagicBlock crank"],
  ["Rivals nobody can rig", "Wire up a separate randomness oracle on the base layer", "MagicBlock VRF, answered on the rollup"],
  ["Cashing out", "A second transaction, or a bot watching for you to leave", "A Magic Action in the same move"],
];

const SOON = [
  ["bank", "The Bank", "Loans and new capital for shops with tidy books"],
  ["tag", "Leasing", "Take the empty lots, open more shops"],
  ["pin", "East District", "A whole neighbourhood behind the mist"],
  ["eye", "Private bids", "Sealed auctions on a Private Ephemeral Rollup"],
  ["clerk", "Managers", "Hire someone to run the counter"],
  ["people", "A shared town", "Compete with real shopkeepers"],
] as const;

const SCENES: { name: string; seconds: number; sound?: () => void; body: () => React.ReactNode }[] = [
  {
    name: "Bazaar", seconds: 7, sound: () => sfx.playVrfAlert(), body: () => (
      <>
        <motion.img initial={{ y: -260, rotate: -8, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 11 }} src="/logo/logo.svg" alt="Bazaar" className="w-[320px] max-w-[80vw] sm:w-[440px]" />
        <motion.p {...rise(0.9)} className="text-center font-display text-xl font-semibold sm:text-3xl">A market town. A corner coffee house. <span className="text-gold">Yours.</span></motion.p>
        <Street delay={1.2} />
      </>
    ),
  },
  {
    name: "The game", seconds: 11, sound: () => sfx.playChing(), body: () => (
      <>
        <Title kicker="How you play">Out-think the shop next door</Title>
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {[["tag", "Set your price", "Too dear and they walk"], ["people", "Read the crowd", "Rush hours and moods"], ["chart", "Study the books", "Share, losses, best price"], ["crate", "Stay stocked", "Empty shelves earn nothing"], ["gavel", "Win auctions", "Buy tomorrow's stock cheap"], ["coin", "Make rent", "It comes every single day"]].map(([icon, t, d], i) => (
            <motion.div key={t} {...pop(0.3 + i * 0.25)} className="panel flex flex-col items-center gap-1 p-3 text-center"><Badge icon={icon} size={52} /><p className="font-display font-semibold">{t}</p><p className="text-xs font-bold text-soft">{d}</p></motion.div>
          ))}
        </div>
      </>
    ),
  },
  {
    name: "Under the cobblestones", seconds: 6, sound: () => sfx.playWin(), body: () => (
      <>
        <motion.p {...rise(0.1)} className="text-sm font-extrabold uppercase tracking-[0.3em] text-paper/70">Under the cobblestones</motion.p>
        <motion.h2 initial={{ scale: 3, opacity: 0, filter: "blur(14px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.5 }} className="bg-gradient-to-r from-[#b7a4ff] via-white to-gold bg-clip-text text-center font-display text-6xl font-bold text-transparent sm:text-8xl">MagicBlock</motion.h2>
        <motion.p {...rise(1.5)} className="max-w-2xl text-center font-display text-lg font-semibold sm:text-2xl">Five primitives hold this town up. All five have run on Solana devnet.</motion.p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Ephemeral Rollups", "Session Keys", "VRF", "Cranks", "Magic Actions"].map((n, i) => <motion.span key={n} {...pop(2 + i * 0.22)} className="rounded-full border-2 border-[#8f72ff] bg-[#8f72ff]/25 px-4 py-2 font-display text-sm font-semibold">{n}</motion.span>)}
        </div>
      </>
    ),
  },
  {
    name: "Ephemeral Rollups", seconds: 13, sound: () => sfx.playChing(), body: () => (
      <>
        <Title kicker="1 · Ephemeral Rollups">Your shop moves into the fast lane</Title>
        <Race />
        <DoesDoesnt does="Runs your prices, sales, restocks, upgrades, auctions and rent, then writes back to Solana." doesnt="Take your tokens with it: your cash waits in the town treasury until you settle." />
      </>
    ),
  },
  {
    name: "Session Keys", seconds: 12, sound: () => sfx.playPriceClick(), body: () => (
      <>
        <Title kicker="2 · Session Keys">A game you can actually play</Title>
        <Popups />
        <DoesDoesnt does="One wallet approval, then six days of moves signed for you, checked by the program every time." doesnt="Touch your wallet's funds. It is a separate key that only has authority in this game." />
      </>
    ),
  },
  {
    name: "VRF", seconds: 12, sound: () => sfx.playGavel(), body: () => (
      <>
        <Title kicker="3 · Verifiable Randomness">Rivals who do not exist until you commit</Title>
        <Bids />
        <DoesDoesnt does="Draws the rival bids after yours is locked, and a new town mood about every minute. The draw is verifiable." doesnt="Hide your bid: it is public on the rollup. Sealed private bids are on the roadmap." />
      </>
    ),
  },
  {
    name: "Cranks", seconds: 11, sound: () => sfx.playChing(), body: () => (
      <>
        <Title kicker="4 · Cranks">The rent collector never sleeps</Title>
        <Rent />
        <DoesDoesnt does="MagicBlock's scheduler collects rent on its own. We run no server and no bot." doesnt="Decide who buys your coffee: shoppers are simulated in your browser." />
      </>
    ),
  },
  {
    name: "Magic Actions", seconds: 11, sound: () => sfx.playWin(), body: () => (
      <>
        <Title kicker="5 · Magic Actions">One press, paid on both sides</Title>
        <Payout />
        <DoesDoesnt does="Leaving the rollup schedules the payout on Solana by itself: you press Settle, nothing else." doesnt="Turn game money into real money. GD is a devnet game currency." />
      </>
    ),
  },
  {
    name: "Without it", seconds: 16, sound: () => sfx.playGavel(), body: () => (
      <>
        <Title kicker="Could you build this without MagicBlock?">A slower cousin with pop-ups and your own servers. Not this.</Title>
        <div className="w-full max-w-4xl space-y-2">
          <div className="hidden grid-cols-[1fr_1.3fr_1.1fr] gap-2 px-3 text-xs font-extrabold uppercase tracking-wide text-paper/70 sm:grid"><span>You want</span><span>On plain Solana</span><span className="text-gold">In Bazaar</span></div>
          {COMPARE.map(([want, plain, here], i) => (
            <motion.div key={want} initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.7 }} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_1.1fr]">
              <p className="rounded-xl bg-black/35 p-3 font-display text-sm font-semibold">{want}</p>
              <p className="rounded-xl border-2 border-berry/70 bg-berry/25 p-3 text-sm font-bold">{plain}</p>
              <p className="panel !bg-gold p-3 text-sm font-extrabold">{here}</p>
            </motion.div>
          ))}
        </div>
      </>
    ),
  },
  {
    name: "The town", seconds: 11, sound: () => sfx.playChing(), body: () => (
      <>
        <Title kicker="Meet the town">They have opinions</Title>
        <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(CAST) as Speaker[]).map((k, i) => (
            <motion.div key={k} {...rise(0.4 + i * 0.4)} className="panel flex flex-col items-center gap-2 p-3 text-center">
              <Badge icon={k} size={96} />
              <p className="font-display text-lg font-semibold leading-tight">{CAST[k].name}</p>
              <p className="text-xs font-extrabold text-soft">{CAST[k].role}</p>
              <p className="text-sm font-bold italic">{{ ravi: "“Price with your head.”", mira: "“Cute shop. Shame about me.”", quill: "“Going once…”", fennick: "“Show me your books.”" }[k]}</p>
            </motion.div>
          ))}
        </div>
      </>
    ),
  },
  {
    name: "Coming soon", seconds: 10, sound: () => sfx.playPriceClick(), body: () => (
      <>
        <Title kicker="Not open yet">The town is only getting bigger</Title>
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {SOON.map(([icon, t, d], i) => (
            <motion.div key={t} {...pop(0.3 + i * 0.2)} className="panel relative flex flex-col items-center gap-1 p-3 text-center"><span className="soon absolute right-2 top-2">soon</span><Badge icon={icon} size={48} className="grayscale-[40%]" /><p className="font-display font-semibold">{t}</p><p className="text-xs font-bold text-soft">{d}</p></motion.div>
          ))}
        </div>
      </>
    ),
  },
  {
    name: "Your turn", seconds: 0, sound: () => sfx.playWin(), body: () => (
      <>
        <motion.div {...pop(0.1)}><Badge icon="ravi" size={130} /></motion.div>
        <Title kicker="Uncle Ravi left you the keys">The shutters are down. Open them.</Title>
        <Street delay={0.6} />
      </>
    ),
  },
];

export const Intro: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [at, setAt] = useState(-1); // -1: the title card, whose button also unlocks sound
  const [paused, setPaused] = useState(false);
  const scene = SCENES[at], last = at === SCENES.length - 1;
  const go = useCallback((n: number) => setAt(Math.max(0, Math.min(SCENES.length - 1, n))), []);

  useEffect(() => { scene?.sound?.(); }, [at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (at >= 0 && e.key === "ArrowRight") go(at + 1);
      else if (at >= 0 && e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go, onDone]);

  return (
    <MotionConfig reducedMotion="user">
      <div role="dialog" aria-modal="true" aria-label="Introduction to Bazaar" className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#2b2152_0%,#14231d_55%,#0b120f_100%)] text-paper">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 28 }, (_, i) => <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-gold" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }} animate={{ opacity: [0.1, 0.8, 0.1], y: [0, -18, 0] }} transition={{ duration: 3 + (i % 5), repeat: Infinity, delay: (i % 7) * 0.4 }} />)}
        </div>

        {at >= 0 && (
          <div className="relative z-10 flex gap-1 px-4 pt-3" aria-hidden>
            {SCENES.map((s, i) => (
              <button key={s.name} tabIndex={-1} onClick={() => go(i)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/20">
                {i < at && <span className="block h-full w-full bg-gold" />}
                {i === at && s.seconds > 0 && <span key={at} onAnimationEnd={() => go(at + 1)} className="block h-full w-full origin-left bg-gold" style={{ animation: `fill ${s.seconds}s linear forwards`, animationPlayState: paused ? "paused" : "running" }} />}
                {i === at && s.seconds === 0 && <span className="block h-full w-full bg-gold" />}
              </button>
            ))}
          </div>
        )}
        <button onClick={onDone} className="btn absolute right-4 top-7 z-20">Skip intro</button>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {at < 0 ? (
              <motion.div key="start" exit={{ opacity: 0, scale: 1.15 }} className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
                <motion.img {...pop()} src="/logo/logo.svg" alt="Bazaar" className="w-[300px] max-w-[80vw] sm:w-[420px]" />
                <motion.button {...rise(0.5)} autoFocus onClick={() => setAt(0)} className="btn btn-gold !h-16 !px-10 !text-xl"><Play className="h-6 w-6" aria-hidden /> Play the intro</motion.button>
                <motion.p {...rise(0.8)} className="text-sm font-bold text-paper/70">About two minutes, with sound</motion.p>
              </motion.div>
            ) : (
              <motion.section key={at} aria-label={scene.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.3 }} className="flex min-h-full flex-col items-center justify-center gap-5 px-4 py-14 sm:gap-7 [@media(min-width:1200px)_and_(min-height:800px)]:[zoom:1.2]">
                {scene.body()}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {at >= 0 && (
          <div className="relative z-10 flex items-center justify-center gap-3 p-4">
            <button className="btn btn-icon" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous scene"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
            {!last && <button className="btn btn-icon" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume" : "Pause"} aria-pressed={paused}>{paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}</button>}
            {last ? (
              <button className="btn btn-gold !h-14 !px-8 !text-lg" onClick={onDone}>Open the doors <ArrowRight className="h-5 w-5" aria-hidden /></button>
            ) : (
              <button className="btn btn-gold" onClick={() => go(at + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden /></button>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
};
