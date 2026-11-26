import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Volume2, VolumeX, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { IsometricEngineV3 } from "./engine/IsometricEngineV3";
import { demandModifiers } from "./engine/cityEvents";
import { clockAt, period, SHOP_RENT } from "./engine/economy";
import { Reports } from "./components/Reports";
import { useStats, profitOf, shopOn } from "./store/statsStore";
import { PLACES, price, money, shopKind, type PlaceId } from "./engine/shopKinds";
import { EventBanner } from "./components/EventBanner";
import { AuctionModal } from "./components/AuctionModal";
import { CityLedger } from "./components/CityLedger";
import { PlotInspector, RESTOCK_UNITS } from "./components/PlotInspector";
import { TownBoard } from "./components/TownBoard";
import { Gate } from "./components/Gate";
import { Intro } from "./components/Intro";
import { StoryGuide, Journal } from "./components/Story";
import { useStory } from "./story/useStory";
import { MY_PLOT, MIRA_PLOT, EMPTY_PLOT, BEATS, type Action, type World } from "./story/script";
import { Badge } from "./components/ui";
import { WalletChip } from "./components/WalletChip";
import { useGameStore } from "./store/gameStore";
import { sfx } from "./audio/sfx";
import { voice } from "./audio/voice";
import { gameChain, type TxLog } from "./solana/gameChain";
import { fetchSolPrice } from "./solana/pyth";

/** the wallet-free sandbox exists only for development: `npm run dev` with ?practice */
const PRACTICE = import.meta.env.DEV && new URLSearchParams(location.search).has("practice");
const INTRO_SEEN = "bazaar_intro_seen";
const PRACTICE_UNIT_COST = 1.37; // GD per unit, matches the on-chain wholesale price

export const App: React.FC = () => {
  const { soundEnabled, toggleSound, addLedgerItem } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsometricEngineV3 | null>(null);

  // practice mode (no wallet): coins live only in this tab
  const [practiceGd, setPracticeGd] = useState(10_000);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solChange, setSolChange] = useState(0);

  const [selected, setSelected] = useState<number | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [reportsFor, setReportsFor] = useState<number | null>(null); // plot whose analytics are open
  const [clock, setClock] = useState(() => clockAt(0));
  const [journalOpen, setJournalOpen] = useState(false);
  const [intro, setIntro] = useState(() => !PRACTICE && !localStorage.getItem(INTRO_SEEN));
  const [entered, setEntered] = useState(PRACTICE); // through the front door
  const enteredRef = useRef(entered);
  enteredRef.current = entered;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [, setTick] = useState(0); // the map owns shop data; re-read it twice a second

  const say = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), message.length > 50 ? 5500 : 2600);
  };

  const closeInspector = () => { setSelected(null); engineRef.current?.select(null); };
  const openShop = (id: number) => {
    setBoardOpen(false);
    setSelected(id);
    engineRef.current?.select(id);
    engineRef.current?.focusPlot(id, true);
  };
  const openPlace = (id: PlaceId) => {
    const place = PLACES.find((p) => p.id === id)!;
    if (id === "bank") useStory.getState().mark("bank");
    if (place.soon) return say(id === "bank" ? "The vault is not open yet. Loans and new capital are coming soon." : `${place.name}: coming soon`);
    setBoardOpen(false);
    closeInspector();
    if (id === "auction") useGameStore.setState({ auctionActive: true });
    else setJournalOpen(true);
  };
  // engine callbacks are registered once, so they go through a ref to see fresh state
  const handlers = useRef({ openShop, openPlace, closeInspector, say });
  handlers.current = { openShop, openPlace, closeInspector, say };

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new IsometricEngineV3();
    engine.init(containerRef.current);
    engineRef.current = engine;
    if (import.meta.env.DEV) (window as unknown as { __engine: IsometricEngineV3 }).__engine = engine; // debugging handle

    engine.onPlotClick = (plot) => handlers.current.openShop(plot.id);
    engine.onLandmarkClick = (id) => handlers.current.openPlace(id as PlaceId);
    engine.onEmptyClick = () => handlers.current.closeInspector();
    engine.onShopper = (hour, rows) => useStats.getState().shopper(hour, rows);
    engine.onTurnedAway = (plotId) => useStats.getState().turnedAway(plotId);
    engine.onCustomerServed = (plotId, priceCents) => {
      const c = gameChain.getState();
      useStats.getState().sale(plotId, priceCents, plotId !== 0 ? 0 : c.phase === "live" ? c.unitCostCents : PRACTICE_UNIT_COST * 100);
      if (plotId !== 0) return;
      if (gameChain.live) gameChain.recordSale(); // paid on-chain from the town treasury in small batches
      else setPracticeGd((gd) => gd + priceCents / 100);
    };
    return () => engine.destroy();
  }, []);

  // the town's clock and crowd; both pause while the tab is hidden
  useEffect(() => {
    let owed = 0, seconds = 0, day = 1;
    const spawner = setInterval(() => {
      if (document.hidden || !enteredRef.current) return; // the town opens when you walk in
      for (owed += demandModifiers(useGameStore.getState().activeEvent).customersPerTick; owed >= 1; owed--) engineRef.current?.spawnCustomer();
    }, 750);
    const ticker = setInterval(() => {
      setTick((t) => t + 1);
      const engine = engineRef.current;
      if (document.hidden || !enteredRef.current || !engine?.plots.length) return;
      const now = clockAt((seconds += 0.5));
      engine.hour = now.hour;
      engine.setDaylight(now.hour < 7 ? 0.28 : now.hour < 8 ? 0.14 : now.hour < 17 ? 0 : Math.min(0.52, (now.hour - 16) * 0.12));
      if (now.day !== day) {
        day = now.day;
        // practice mode charges rent here; with a wallet the rollup's crank does it
        if (!gameChain.live) {
          setPracticeGd((g) => Math.max(0, g - SHOP_RENT));
          useStats.getState().paidRent(SHOP_RENT * 100);
        }
        const yesterday = useStats.getState().days.at(-1)!;
        useStats.getState().startDay(day);
        const repriced = engine.newDay();
        handlers.current.say(`Day ${day}: yesterday's profit ${money(profitOf(shopOn(yesterday, 0)) / 100)}. Rivals restocked, ${repriced} changed price.`);
      }
      setClock((c) => (c.day === now.day && c.hour === now.hour ? c : now));
    }, 500);
    return () => { clearInterval(spawner); clearInterval(ticker); };
  }, []);

  useEffect(() => { sfx.enabled = soundEnabled; voice.setEnabled(soundEnabled); }, [soundEnabled]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"]') && handlers.current.closeInspector();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logChain = (type: "PRICE" | "TICK" | "AUCTION" | "VRF" | "SETTLE", r: TxLog) =>
    addLedgerItem({ type, message: r.message, signature: r.signature, latencyMs: r.latencyMs, network: r.er ? "ER" : "Base" });

  // Real wallet → one session approval → everything else is signed by the session key
  const { publicKey, signTransaction, connected } = useWallet();
  const signRef = useRef(signTransaction);
  signRef.current = signTransaction;
  const walletKey = publicKey?.toBase58();
  useEffect(() => {
    if (connected && publicKey && signRef.current) {
      gameChain.connect({ publicKey, signTransaction: (tx) => signRef.current!(tx) }, logChain);
    } else {
      gameChain.disconnect();
    }
  }, [connected, walletKey]);
  const chain = useSyncExternalStore(gameChain.subscribe, gameChain.getState);
  const live = chain.phase === "live";

  // the front door closes again if the wallet goes away
  useEffect(() => {
    if (!PRACTICE && (!connected || chain.phase === "disconnected")) { setEntered(false); setSelected(null); setBoardOpen(false); setReportsFor(null); setJournalOpen(false); useGameStore.setState({ auctionActive: false }); }
  }, [connected, chain.phase]);
  useEffect(() => { if (PRACTICE) useStory.getState().load("practice"); }, []);
  const enter = () => {
    useStory.getState().load(walletKey ?? "practice");
    setEntered(true);
    sfx.playWin();
  };
  // the story hears about things through the activity feed
  const feed = useGameStore((g) => g.cityLedger);
  const heard = useRef(new Set<string>());
  useEffect(() => {
    for (const item of [...feed].reverse()) {
      if (heard.current.has(item.id)) continue;
      heard.current.add(item.id);
      const what = /^Auction (won|lost)/.test(item.message) ? "auction" : /^Rent paid/.test(item.message) ? "rent" : /settled your (rollup )?cash/i.test(item.message) ? "settle" : null;
      if (what) useStory.getState().mark(what);
    }
  }, [feed]);

  // mirror on-chain stock and price into the map (sold out on-chain = sold out in town)
  useEffect(() => {
    if (!live) return;
    const sync = () => {
      const c = gameChain.getState();
      engineRef.current?.updatePlotData(0, { inventory: Math.max(0, c.inventory - c.pendingSales), priceCents: c.pendingPrice ?? c.priceCents, isUpgraded: c.upgrades > 0 });
      const activeEvent = c.cityEvent?.name ?? "Quiet", eventTarget = c.cityEvent?.target ?? 0;
      const g = useGameStore.getState();
      if (g.activeEvent !== activeEvent || g.eventTarget !== eventTarget) {
        useGameStore.setState({ activeEvent, eventTarget });
        if (activeEvent !== "Quiet") sfx.playVrfAlert();
      }
    };
    sync();
    const id = setInterval(sync, 700); // also covers the engine finishing its async load after the first chain update
    return () => { clearInterval(id); useGameStore.setState({ activeEvent: "Quiet", eventTarget: 0 }); };
  }, [live]);

  // rent charged on-chain goes into today's books
  const rentSeen = useRef<number | null>(null);
  useEffect(() => {
    if (!live) { rentSeen.current = null; return; }
    if (rentSeen.current !== null && chain.rentPaidGd > rentSeen.current) useStats.getState().paidRent(Math.round((chain.rentPaidGd - rentSeen.current) * 100));
    rentSeen.current = chain.rentPaidGd;
  }, [live, chain.rentPaidGd]);

  // Live Pyth SOL/USD every 15s; push the signal on-chain every 5 min
  useEffect(() => {
    let lastCrank = 0;
    const poll = async () => {
      try {
        const p = await fetchSolPrice();
        setSolPrice(p.price);
        setSolChange(Number(p.change1hPct.toFixed(2)));
        if (gameChain.live && Date.now() - lastCrank > 300_000) {
          lastCrank = Date.now();
          gameChain.crankSignals();
        }
      } catch (e) {
        console.warn("Pyth fetch failed", e);
      }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, []);

  const shops = (engineRef.current?.plots ?? []).filter((p) => p.ownerType !== "unclaimed");
  const mine = shops.find((p) => p.id === 0);
  const plot = selected === null ? null : engineRef.current?.plots.find((p) => p.id === selected) ?? null;
  const rivals = shops.filter((p) => p.id !== 0 && p.businessType === mine?.businessType && p.inventory > 0).sort((a, b) => a.priceCents - b.priceCents);
  const gd = live ? chain.gd : practiceGd;
  const stockCap = live ? 200 * (chain.upgrades & 2 ? 2 : 1) : mine?.maxInventory ?? 100;
  const restockCost = Math.round((live ? chain.unitCostCents / 100 : PRACTICE_UNIT_COST) * RESTOCK_UNITS * 100) / 100;

  const reprice = (cents: number) => {
    engineRef.current?.updatePlotData(0, { priceCents: cents });
    gameChain.setPrice(cents); // no-op until a session is live
    sfx.playPriceClick();
    setTick((t) => t + 1);
  };
  const failed = (what: string) => (e: unknown) => say(`${what} failed: ${String((e as { message?: string })?.message ?? e).slice(0, 90)}`);
  const restock = () => {
    const booked = () => useStats.getState().spent(Math.round(restockCost * 100));
    if (live) return gameChain.restock(RESTOCK_UNITS).then(booked, failed("Restock"));
    if (!mine) return;
    booked();
    setPracticeGd((g) => g - restockCost);
    engineRef.current?.updatePlotData(0, { inventory: mine.inventory + RESTOCK_UNITS });
  };
  const upgrade = () => gameChain.buyUpgrade(1, "Signage (stronger brand)").catch(failed("Signage"));

  const reported = reportsFor === null ? null : engineRef.current?.plots[reportsFor];
  const stats = [
    { icon: "coin", name: live ? "Your cash" : "Practice cash", value: money(gd) },
    { icon: "crate", name: "Stock", value: mine ? (mine.inventory === 0 ? "Out!" : String(mine.inventory)) : "…", warn: mine?.inventory === 0 },
    { icon: "tag", name: "Your price", value: mine ? price(mine.priceCents) : "…" },
  ];
  const dock = [
    { icon: "coffee", name: "My shop", onClick: () => openShop(0) },
    { icon: "pin", name: "Town", onClick: () => { closeInspector(); setBoardOpen(true); } },
    { icon: "chart", name: "Reports", onClick: () => { closeInspector(); setReportsFor(0); } },
    { icon: "gavel", name: "Auction", onClick: () => openPlace("auction") },
    { icon: "help", name: "Story", onClick: () => { closeInspector(); setJournalOpen(true); } },
  ];
  const story = useStory();
  const activeEvent = useGameStore((g) => g.activeEvent);
  const auctionOpen = useGameStore((g) => g.auctionActive);
  const books = useStats((st) => st.days).map((d) => shopOn(d, MY_PLOT));
  const total = (f: (d: (typeof books)[number]) => number) => books.reduce((n, d) => n + f(d), 0);
  const world: World = {
    live, rollup: live && chain.erMode, selected, selectedEmpty: plot?.ownerType === "unclaimed", boardOpen, reportsFor, auctionOpen,
    eventActive: activeEvent !== "Quiet", myPrice: mine?.priceCents ?? 0, sold: total((d) => d.sold), stockSpend: total((d) => d.stockSpend), marks: story.marks,
  };
  const closeAll = () => { closeInspector(); setBoardOpen(false); setReportsFor(null); setJournalOpen(false); useGameStore.setState({ auctionActive: false }); };
  const act = (a: Action) => {
    if (a === "dismiss") { setBoardOpen(false); setReportsFor(null); useGameStore.setState({ auctionActive: false }); return; }
    closeAll();
    if (a === "shop") openShop(MY_PLOT);
    else if (a === "mira") openShop(MIRA_PLOT);
    else if (a === "lot") openShop(EMPTY_PLOT);
    else if (a === "board") setBoardOpen(true);
    else if (a === "reports") setReportsFor(MY_PLOT);
    else if (a === "auction") useGameStore.setState({ auctionActive: true });
    else if (a === "bank") { engineRef.current?.focusPlace("bank"); openPlace("bank"); }
  };
  const look = (where: number | string | null) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setMarker(typeof where === "number" || (where && where !== "town") ? (where as number | PlaceId) : null);
    if (where === "town") engine.resetCamera();
    else if (typeof where === "number") engine.focusPlot(where);
    else if (where) engine.focusPlace(where as PlaceId);
  };
  const modalOpen = boardOpen || reportsFor !== null || auctionOpen || journalOpen;
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;
  const telling = entered && story.playing;

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden font-sans">
      <div ref={containerRef} className="fixed inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {entered && <>
      <header className="pointer-events-none fixed inset-x-4 top-3 z-30 flex flex-wrap items-start justify-between gap-3">
        <div data-tour="clock" className="panel pointer-events-auto flex items-center gap-2 !bg-wood py-1.5 pl-2 pr-4 !text-paper">
          <img src="/logo/icon.svg" alt="" width={44} height={44} draggable={false} className="shrink-0" />
          <div>
            <h1 className="font-display text-xl font-bold leading-none tracking-wide">Bazaar</h1>
            <p className="text-xs font-bold tabular-nums text-paper/80" title={period(clock.hour).name}>Day {clock.day} · {String(clock.hour).padStart(2, "0")}:00 · {live ? (chain.erMode ? "Rollup" : "Devnet") : "Practice"}</p>
            <p className="text-[11px] font-extrabold text-gold">{period(clock.hour).name}</p>
          </div>
        </div>

        <dl data-tour="stats" className="panel pointer-events-auto flex divide-x-2 divide-ink/15 px-1 py-1.5">
          {stats.map((st) => (
            <div key={st.name} className="flex items-center gap-2 px-3">
              <Badge icon={st.icon} size={32} className="hidden sm:block" />
              <div>
                <dt className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wide text-soft">{st.name}</dt>
                <dd className={`min-w-[3.5rem] whitespace-nowrap font-display text-lg font-semibold leading-tight tabular-nums ${st.warn ? "text-berry" : ""}`}>{st.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="btn hidden cursor-default tabular-nums xl:flex" title="Live SOL/USD from Pyth, with the change over the last hour">
            SOL {solPrice === null ? "…" : `$${solPrice.toFixed(2)}`}
            {solChange !== 0 && <span className={solChange > 0 ? "text-leaf" : "text-berry"}>{solChange > 0 ? "▲" : "▼"} {Math.abs(solChange)}%</span>}
          </div>
          <WalletChip />
          <button onClick={toggleSound} aria-label={soundEnabled ? "Mute sounds" : "Turn sounds on"} aria-pressed={!soundEnabled} className="btn btn-icon">
            {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </header>

      <nav aria-label="Main" className="fixed left-4 top-[104px] z-30 flex flex-col gap-3 max-sm:bottom-3 max-sm:left-1/2 max-sm:top-auto max-sm:-translate-x-1/2 max-sm:flex-row max-sm:gap-2">
        {dock.map((d) => (
          <button key={d.name} data-tour={`dock-${d.name.toLowerCase().replace(" ", "")}`} onClick={d.onClick} className="btn !h-[68px] !w-[72px] flex-col !gap-0.5 !px-0 max-sm:!w-[62px]">
            <Badge icon={d.icon} size={38} />
            <span className="text-xs">{d.name}</span>
          </button>
        ))}
      </nav>

      <div className="pointer-events-none fixed inset-x-4 top-[92px] z-20 flex justify-center [&>*]:pointer-events-auto">
        <EventBanner />
      </div>
      {toast && (
        <p role="status" className="panel pointer-events-none fixed left-1/2 top-[176px] z-[60] w-max max-w-[90vw] -translate-x-1/2 animate-pop !bg-gold px-4 py-2 font-display text-sm font-semibold">{toast}</p>
      )}

      <div className="pointer-events-none fixed inset-x-4 bottom-3 z-30 flex flex-wrap items-end justify-between gap-3 max-sm:bottom-[96px]">
        {/* the story card sits here; the activity feed steps aside unless the story is pointing at it */}
        <div className={`pointer-events-auto ${telling && BEATS[story.at].spot !== "activity" ? "invisible" : ""}`}><CityLedger /></div>
        <div role="group" aria-label="Camera" className="pointer-events-auto ml-auto flex gap-2 max-sm:hidden">
          <button onClick={() => engineRef.current?.zoomIn()} aria-label="Zoom in" className="btn btn-icon"><ZoomIn className="h-4 w-4" aria-hidden /></button>
          <button onClick={() => engineRef.current?.zoomOut()} aria-label="Zoom out" className="btn btn-icon"><ZoomOut className="h-4 w-4" aria-hidden /></button>
          <button onClick={() => engineRef.current?.resetCamera()} aria-label="Show the whole town" title="Show the whole town" className="btn btn-icon"><Maximize className="h-4 w-4" aria-hidden /></button>
        </div>
      </div>

      </>}

      {plot && (
        <PlotInspector
          key={`panel-${plot.id}`}
          plot={plot}
          rivals={rivals}
          myPriceCents={mine?.priceCents ?? 0}
          myTrade={mine?.businessType ?? "CoffeeCart"}
          myTier={mine?.tier ?? "Corner"}
          today={shopOn(useStats.getState().days.at(-1)!, plot.id)}
          onStats={() => setReportsFor(plot.id)}
          gd={gd}
          restockCostGd={restockCost}
          stockCap={stockCap}
          live={live}
          signage={live && (chain.upgrades & 1) !== 0}
          onClose={closeInspector}
          onReprice={reprice}
          onRestock={restock}
          onUpgrade={upgrade}
        />
      )}
      {boardOpen && (
        <TownBoard shops={shops} onClose={() => setBoardOpen(false)} onShop={openShop} onPlace={(id) => { engineRef.current?.focusPlace(id); openPlace(id); }} />
      )}
      {reported && (
        <Reports
          key={`report-${reported.id}`}
          shop={{
            id: reported.id,
            type: reported.businessType,
            name: reported.id === 0 ? "Corner Roast" : shopKind(reported.businessType).name,
            sub: reported.id === 0 ? "Your shop" : `Run by ${reported.owner}`,
          }}
          sellers={engineRef.current?.sellers() ?? []}
          unitCostCents={live ? chain.unitCostCents : PRACTICE_UNIT_COST * 100}
          onSetPrice={reprice}
          onClose={() => setReportsFor(null)}
        />
      )}
      <AuctionModal />
      {entered && <StoryGuide world={world} busy={modalOpen || (narrow && plot !== null)} onAction={act} onLook={look} />}
      {journalOpen && (
        <Journal
          onClose={() => setJournalOpen(false)}
          onIntro={() => { setJournalOpen(false); setIntro(true); }}
          stats={[["Cups sold", String(world.sold)], ["Revenue", money(total((d) => d.revenue) / 100)], ["Rent paid", money(total((d) => d.rent) / 100)], ["Auctions", String(story.marks.auction)]]}
        />
      )}
      {!entered && !intro && <Gate onEnter={enter} onIntro={() => setIntro(true)} />}
      {intro && <Intro onDone={() => { localStorage.setItem(INTRO_SEEN, "1"); setIntro(false); }} />}
    </div>
  );
};
