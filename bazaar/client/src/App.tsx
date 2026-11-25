import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Volume2,
  VolumeX,
  Building2,
  Eye,
  TrendingUp,
  Sparkles,
  Bot,
  Play,
  Briefcase,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  DollarSign,
  HelpCircle,
  Landmark,
  Shield,
  Layers,
  BarChart3,
  Globe2,
  Users,
} from "lucide-react";
import { IsometricEngineV3, PlotInfo } from "./engine/IsometricEngineV3";
import { EventBanner } from "./components/EventBanner";
import { AuctionModal } from "./components/AuctionModal";
import { CityLedger } from "./components/CityLedger";
import { ResultsModal } from "./components/ResultsModal";
import { BankModal } from "./components/BankModal";
import { IntelModal } from "./components/IntelModal";
import { UncleRaviOverlay } from "./components/UncleRaviOverlay";
import { DemoDirectorToolbar } from "./components/DemoDirectorToolbar";
import { PlotInspector } from "./components/PlotInspector";
import { GuidedTour } from "./components/GuidedTour";
import { MultiplayerLobbyModal } from "./components/MultiplayerLobbyModal";
import { StatusBoardModal } from "./components/StatusBoardModal";
import { useGameStore } from "./store/gameStore";
import { sfx } from "./audio/sfx";
import { gameChain, type TxLog } from "./solana/gameChain";
import { fetchSolPrice } from "./solana/pyth";
import { WalletChip } from "./components/WalletChip";

export const App: React.FC = () => {
  const {
    stalls,
    localPlayerIndex,
    remainingSeconds,
    soundEnabled,
    toggleSound,
    addLedgerItem,
  } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<IsometricEngineV3 | null>(null);

  // v2 Tycoon State
  const [day, setDay] = useState<number>(1);
  const [reputation, setReputation] = useState<number>(45);
  const [netWorthGd, setNetWorthGd] = useState<number>(18450);
  const [cashGd, setCashGd] = useState<number>(10000);
  const [customersServedToday, setCustomersServedToday] = useState<number>(0);
  const [revenueTodayCents, setRevenueTodayCents] = useState<number>(0);

  // Modals & Panels
  const [isBankOpen, setIsBankOpen] = useState<boolean>(false);
  const [isIntelOpen, setIsIntelOpen] = useState<boolean>(false);
  const [isDirectorOpen, setIsDirectorOpen] = useState<boolean>(false);
  const [isNight, setIsNight] = useState<boolean>(false);
  const [solPumpChange, setSolPumpChange] = useState<number>(0); // Director demo override
  const [solPrice, setSolPrice] = useState<number | null>(null); // live Pyth SOL/USD
  const [solLiveChange, setSolLiveChange] = useState<number>(0);
  const [uncleRaviStage, setUncleRaviStage] = useState<number>(0);
  const [showUncleRavi, setShowUncleRavi] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState<boolean>(false);
  const [showStatusBoard, setShowStatusBoard] = useState<boolean>(false);
  const [selectedPlot, setSelectedPlot] = useState<PlotInfo | null>(null);

  // Auto-launch Guided Tour on First Visit
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("bazaar_seen_tour_v2");
    if (!hasSeenTour) {
      setShowGuidedTour(true);
      localStorage.setItem("bazaar_seen_tour_v2", "true");
    }
  }, []);

  // Mount 28x28 IsometricEngineV3 Canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new IsometricEngineV3();
    engine.init(containerRef.current);
    engineRef.current = engine;
    if (import.meta.env.DEV) (window as unknown as { __engine: IsometricEngineV3 }).__engine = engine; // debugging handle

    // Connect Plot Click to slide-over inspector
    engine.onPlotClick = (plot: PlotInfo) => {
      setSelectedPlot(plot);
      sfx.playPriceClick();
    };

    // Connect Landmark Click to corresponding modal
    engine.onLandmarkClick = (modal: string) => {
      sfx.playPriceClick();
      if (modal === "bank") setIsBankOpen(true);
      else if (modal === "auction") useGameStore.setState({ auctionActive: true });
      else if (modal === "intel") setIsIntelOpen(true);
      else if (modal === "uncleRavi") setShowUncleRavi(true);
      else if (modal === "manager") setIsDirectorOpen(true);
      else if (modal === "spectator") setShowStatusBoard(true);
    };

    // Customer served callback for real P&L updates
    engine.onCustomerServed = (plotId: number, priceCents: number) => {
      if (plotId === 0) {
        setCustomersServedToday((prev) => prev + 1);
        setRevenueTodayCents((prev) => prev + priceCents);
        if (gameChain.live) {
          gameChain.recordSale(); // paid on-chain from the town treasury in small batches
        } else {
          setCashGd((prev) => prev + Math.round(priceCents / 100));
          setNetWorthGd((prev) => prev + Math.round(priceCents / 100));
          addLedgerItem({
            type: "TICK",
            message: `Customer served at Corner Roast: +$${(priceCents / 100).toFixed(2)} [simulated: connect a wallet to play on-chain]`,
            signature: "sim-sale",
            latencyMs: 18,
            network: "ER",
          });
        }
      }
    };

    return () => {
      engine.destroy();
    };
  }, []);

  // Guaranteed Continuous NPC customer generator (1.1s ticks)
  useEffect(() => {
    const spawner = setInterval(() => {
      if (!engineRef.current) return;
      engineRef.current.spawnCustomer();
    }, 1100);

    return () => clearInterval(spawner);
  }, []);

  // Day countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      useGameStore.setState((prev) => {
        if (prev.remainingSeconds <= 1) {
          return { remainingSeconds: 300, tick: prev.tick + 1 };
        }
        return { remainingSeconds: prev.remainingSeconds - 1, tick: prev.tick + 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Camera Controls
  const handleZoomIn = () => engineRef.current?.zoomIn();
  const handleZoomOut = () => engineRef.current?.zoomOut();
  const handleResetCamera = () => engineRef.current?.resetCamera();
  const handleFocusPlayerPlot = () => engineRef.current?.focusPlayerPlot();

  // Demo Director Handlers
  const handleToggleNight = () => {
    const newNight = !isNight;
    setIsNight(newNight);
    engineRef.current?.setNightMode(newNight);
    addLedgerItem({
      type: "TICK",
      message: newNight
        ? "🌙 Overnight phase active: Autonomous Managers trading on 10s ticks"
        : "☀️ Daylight: Market hours active on 1s ticks",
      signature: "3mP9...crankPhase",
      latencyMs: 25,
      network: "ER",
    });
    sfx.playPriceClick();
  };

  const handleSimulateSolPump = () => {
    const newPump = solPumpChange === 0 ? 5.2 : 0;
    setSolPumpChange(newPump);
    if (newPump > 0) {
      addLedgerItem({
        type: "VRF",
        message: "Pyth Lazer feed: SOL +5.2% 1h pump → Electronics demand scaled +26%",
        signature: "8qW2...pythFeed",
        latencyMs: 12,
        network: "ER",
      });
      sfx.playVrfAlert();
    }
  };

  const handleTriggerMarginCall = () => {
    addLedgerItem({
      type: "AUCTION",
      message: "⚠️ Margin call triggered on Rival #2 (LTV 85%). Dutch Auction liquidation pending.",
      signature: "9xZ4...marginCall",
      latencyMs: 19,
      network: "ER",
    });
    sfx.playGavel();
  };

  const handleFastForwardDay = () => {
    setDay((prev) => Math.min(7, prev + 1));
    setReputation((prev) => Math.min(100, prev + 15));
    setCashGd((prev) => prev + 2400);
    setNetWorthGd((prev) => prev + 3500);
    addLedgerItem({
      type: "TICK",
      message: `Day ${day + 1} Opening Bell: Rent collected, plot auctions initialized on Private ER`,
      signature: "2vB8...openDayCrank",
      latencyMs: 38,
      network: "PER",
    });
    sfx.playChing();
  };

  const logChain = (type: "PRICE" | "TICK" | "AUCTION" | "VRF" | "SETTLE", r: TxLog) =>
    addLedgerItem({ type, message: r.message, signature: r.signature, latencyMs: r.latencyMs, network: "Base" });

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
  const chainLive = chain.phase === "live";
  const displayCash = chainLive ? chain.gd : cashGd;
  const displayNetWorth = chainLive ? Math.round(chain.gd + 5000 + chain.inventory * 1.5) : netWorthGd;

  // mirror on-chain stock and price into the map (sold out on-chain = sold out in town)
  useEffect(() => {
    if (!chainLive) return;
    const sync = () => {
      const c = gameChain.getState();
      const patch = { inventory: Math.max(0, c.inventory - c.pendingSales), priceCents: c.pendingPrice ?? c.priceCents, isUpgraded: c.upgrades > 0 };
      engineRef.current?.updatePlotData(0, patch);
      setSelectedPlot((sp) => (sp && sp.id === 0 && (sp.inventory !== patch.inventory || sp.priceCents !== patch.priceCents || sp.isUpgraded !== patch.isUpgraded) ? { ...sp, ...patch } : sp));
    };
    sync();
    const id = setInterval(sync, 1500); // also covers the engine finishing its async load after the first chain update
    return () => clearInterval(id);
  }, [chainLive]);

  // Live Pyth SOL/USD every 15s; push the signal on-chain every 5 min
  useEffect(() => {
    let lastCrank = 0;
    const poll = async () => {
      try {
        const p = await fetchSolPrice();
        setSolPrice(p.price);
        setSolLiveChange(Number(p.change1hPct.toFixed(2)));
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

  // Reprice Plot: optimistic UI, debounced real set_business_price on devnet
  const handleRepricePlot = (plotId: number, newPriceCents: number) => {
    if (engineRef.current) {
      engineRef.current.updatePlotData(plotId, { priceCents: newPriceCents });
      if (selectedPlot && selectedPlot.id === plotId) {
        setSelectedPlot({ ...selectedPlot, priceCents: newPriceCents });
      }
    }
    if (plotId === 0) gameChain.setPrice(newPriceCents);
    sfx.playPriceClick();
  };

  // Stalls Leaderboard for Status Board
  const stallsLeaderboard = (engineRef.current?.plots || [])
    .filter((p) => p.ownerType !== "unclaimed")
    .map((p) => ({
      name: p.streetName + " Stall",
      owner: p.owner || "Merchant",
      priceCents: p.priceCents,
      inventory: p.inventory,
      customersServed: p.customersServed,
      revenueCents: p.revenueTodayCents,
      isPlayer: p.ownerType === "player",
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090d16] text-[#f7f0e3] select-none font-sans">
      {/* 2.5D Isometric Diorama Fullscreen Canvas */}
      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* TOP FLOATING BAR: Gilded Merchant Guild Header */}
      <header className="fixed top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between gap-3 [&_*]:whitespace-nowrap">
        {/* Left Badge: Title & Season Day */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#1c1815]/92 border border-[#d4a359]/35 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-2xl filter drop-shadow">🏛️</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif font-black text-base tracking-wider text-amber-300 uppercase leading-none">
                  Bazaar v2
                </h1>
                <span className="hidden 2xl:inline text-[9px] px-2 py-0.5 rounded-full bg-[#d4a359]/20 text-[#d4a359] border border-[#d4a359]/40 font-mono font-bold">
                  8 PRIMITIVES
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                Grand District • Day {day}/7
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#d4a359]/20 mx-1" />

          {/* Day / Night Phase Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isNight ? "bg-indigo-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="hidden 2xl:inline text-gray-300 font-bold" title={isNight ? "Overnight (10s ticks)" : "Market hours (1s ticks)"}>
              {isNight ? "Overnight (10s)" : "Market Hours (1s)"}
            </span>
            <span className="text-amber-400 font-bold bg-[#120f0d] px-2 py-0.5 rounded border border-[#d4a359]/20">
              {Math.floor(remainingSeconds / 60)}:
              {(remainingSeconds % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Center Badge: Season Net Worth & Cash */}
        <div className="pointer-events-auto flex items-center gap-4 bg-[#1c1815]/92 border border-[#d4a359]/35 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">Net Worth</span>
              <span className="font-mono font-black text-sm text-white">
                {displayNetWorth.toLocaleString()} <span className="text-[10px] text-amber-400">GD</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#d4a359]/20" />

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">Cash Reserve</span>
              <span className="font-mono font-black text-sm text-emerald-400">
                {displayCash.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[10px]">GD</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#d4a359]/20" />

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">Reputation</span>
              <span className="font-mono font-black text-sm text-indigo-300">
                {reputation}/100
              </span>
            </div>
          </div>
        </div>

        {/* Right Badge: Pyth Lazer Feed & Controls */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-[#1c1815]/92 border border-[#d4a359]/35 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#120f0d] border border-[#d4a359]/20 rounded-xl text-xs font-mono">
            <span className="text-gray-400"><span className="hidden 2xl:inline">Pyth </span>SOL:</span>
            {(() => {
              const change = solPumpChange > 0 ? solPumpChange : solLiveChange;
              return (
                <>
                  <span className={`font-bold ${change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-gray-200"} ${solPumpChange > 0 ? "animate-pulse" : ""}`}>
                    {solPrice === null ? "…" : `$${solPrice.toFixed(2)}`}{" "}
                    {change !== 0 && `(${change > 0 ? "+" : ""}${change}%)`}
                  </span>
                  <TrendingUp className={`w-3.5 h-3.5 ${change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400 rotate-90" : "text-gray-500"}`} />
                </>
              );
            })()}
          </div>

          <WalletChip />

          <button
            onClick={() => setShowMultiplayerLobby(true)}
            title="Multiplayer World & Bot Backfill"
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>World</span>
          </button>

          <button
            onClick={() => setShowStatusBoard(true)}
            title="Status Board & P&L Dashboard"
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>P&L</span>
          </button>

          <button
            onClick={toggleSound}
            title="Toggle Sound Effects"
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </header>

      {/* LEFT DOCK: Slim Quick-Access Icon Rail */}
      <nav className="fixed left-4 top-24 z-30 pointer-events-auto flex flex-col gap-2.5 bg-[#1c1815]/92 border border-[#d4a359]/35 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
        <button
          onClick={handleFocusPlayerPlot}
          title="Center on My Shop (Plot #0)"
          className="p-2.5 bg-[#10b981]/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all group flex flex-col items-center"
        >
          <Crosshair className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">My Shop</span>
        </button>

        <button
          onClick={() => setShowStatusBoard(true)}
          title="Status Board & P&L Dashboard"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-amber-600/30 text-amber-400 border border-[#d4a359]/25 hover:border-amber-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">P&L</span>
        </button>

        <button
          onClick={() => setShowMultiplayerLobby(true)}
          title="Multiplayer Season World"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-indigo-600/30 text-indigo-400 border border-[#d4a359]/25 hover:border-indigo-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Globe2 className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">World</span>
        </button>

        <button
          onClick={() => setIsBankOpen(true)}
          title="First District Bank (Loans & Vaults)"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-emerald-600/30 text-emerald-400 border border-[#d4a359]/25 hover:border-emerald-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Bank</span>
        </button>

        <button
          onClick={() => useGameStore.setState({ auctionActive: true })}
          title="Auction House (Sealed-Bid Shipments)"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-amber-600/30 text-amber-400 border border-[#d4a359]/25 hover:border-amber-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Play className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Auction</span>
        </button>

        <button
          onClick={() => setIsIntelOpen(true)}
          title="Intel Guild (Scouting & M&A Offers)"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-purple-600/30 text-purple-400 border border-[#d4a359]/25 hover:border-purple-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Eye className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Intel</span>
        </button>

        <button
          onClick={() => setShowGuidedTour(true)}
          title="Interactive 0-to-100 Guided Tour"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-amber-600/30 text-amber-300 border border-[#d4a359]/25 hover:border-amber-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Tour</span>
        </button>

        <button
          onClick={() => setShowUncleRavi(true)}
          title="Uncle Ravi's Advice"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-orange-600/30 text-orange-400 border border-[#d4a359]/25 hover:border-orange-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Guide</span>
        </button>

        <button
          onClick={() => setIsDirectorOpen(!isDirectorOpen)}
          title="Hackathon Demo Director Toolbar"
          className="p-2.5 bg-[#d4a359]/15 hover:bg-indigo-600/30 text-indigo-400 border border-[#d4a359]/25 hover:border-indigo-500/50 rounded-xl transition-all group flex flex-col items-center"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[9px] font-mono mt-0.5 group-hover:block hidden">Director</span>
        </button>
      </nav>

      {/* TOP CENTER EVENT BANNER */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-lg w-full px-4">
        <EventBanner />
      </div>

      {/* BOTTOM FLOATING BAR: City Ledger Ticker + Camera Controls */}
      <div className="fixed bottom-3 left-4 right-4 z-30 pointer-events-none flex items-end justify-between gap-4">
        {/* City Ledger on Left */}
        <div className="pointer-events-auto w-[620px] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-[#d4a359]/35 bg-[#1c1815]/95 backdrop-blur-md">
          <CityLedger />
        </div>

        {/* Camera Control Pill on Right */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#1c1815]/92 border border-[#d4a359]/35 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFocusPlayerPlot}
            title="Center on My Shop (Plot #0)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/25 hover:bg-[#10b981]/35 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-bold transition-all"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>My Shop</span>
          </button>
          <button
            onClick={handleResetCamera}
            title="Reset Diorama View"
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide-over Right Plot Inspector */}
      {selectedPlot && (
        <PlotInspector
          plot={selectedPlot}
          chain={chainLive ? { gd: chain.gd, inventory: chain.inventory, upgrades: chain.upgrades } : undefined}
          onRestock={() => gameChain.restock(20).catch((e) => addLedgerItem({ type: "TICK", message: `Restock failed: ${String(e.message ?? e).slice(0, 80)}`, signature: "sim-restock", latencyMs: 0, network: "Base" }))}
          onUpgrade={() => gameChain.buyUpgrade(1, "Signage (+15% traffic)").catch((e) => addLedgerItem({ type: "TICK", message: `Upgrade failed: ${String(e.message ?? e).slice(0, 80)}`, signature: "sim-upgrade", latencyMs: 0, network: "Base" }))}
          onClose={() => setSelectedPlot(null)}
          onReprice={handleRepricePlot}
          onHireManager={() => {
            setIsDirectorOpen(true);
            sfx.playPriceClick();
          }}
          onScoutPlot={() => {
            setIsIntelOpen(true);
            sfx.playPriceClick();
          }}
        />
      )}

      {/* Modals & Overlays */}
      <AuctionModal />
      <ResultsModal />
      <BankModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        reputation={reputation}
      />
      <IntelModal isOpen={isIntelOpen} onClose={() => setIsIntelOpen(false)} />
      <GuidedTour
        isOpen={showGuidedTour}
        onClose={() => setShowGuidedTour(false)}
        onFocusPlot={handleFocusPlayerPlot}
        onOpenBank={() => setIsBankOpen(true)}
        onOpenAuction={() => useGameStore.setState({ auctionActive: true })}
        onReprice={(price) => handleRepricePlot(0, price)}
      />
      <MultiplayerLobbyModal
        isOpen={showMultiplayerLobby}
        onClose={() => setShowMultiplayerLobby(false)}
        worldId="season-alpha-1"
        onJoinWorld={(id) => {
          addLedgerItem({
            type: "TICK",
            message: `Switched to world ${id} on MagicBlock Ephemeral Rollup`,
            signature: "3vK8...worldJoin",
            latencyMs: 22,
            network: "ER",
          });
          setShowMultiplayerLobby(false);
        }}
        humanPlayersCount={2}
        botPlayersCount={2}
        isEphemeralRollupActive={true}
      />
      <StatusBoardModal
        isOpen={showStatusBoard}
        onClose={() => setShowStatusBoard(false)}
        day={day}
        cashGd={displayCash}
        netWorthGd={displayNetWorth}
        reputation={reputation}
        customersServedToday={customersServedToday}
        revenueTodayCents={revenueTodayCents}
        wholesaleExpensesCents={500}
        rentExpensesCents={400}
        stallsLeaderboard={stallsLeaderboard}
      />
      {showUncleRavi && (
        <UncleRaviOverlay
          currentStage={uncleRaviStage}
          onAdvance={() => setUncleRaviStage((prev) => (prev < 2 ? prev + 1 : 0))}
          onDismiss={() => setShowUncleRavi(false)}
        />
      )}
      <DemoDirectorToolbar
        isOpen={isDirectorOpen}
        onToggle={() => setIsDirectorOpen(!isDirectorOpen)}
        onToggleNight={handleToggleNight}
        onSimulateSolPump={handleSimulateSolPump}
        onTriggerMarginCall={handleTriggerMarginCall}
        onFastForwardDay={handleFastForwardDay}
        isNight={isNight}
        solPriceChange={solPumpChange}
      />
    </div>
  );
};
