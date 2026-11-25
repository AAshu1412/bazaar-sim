import { create } from "zustand";
import { Keypair } from "@solana/web3.js";

export type EventType =
  | "Quiet"
  | "DemandSurge"
  | "DemandDrop"
  | "ViralStall"
  | "SupplyShock"
  | "FlashSale";

export interface StallData {
  index: number;
  name: string;
  authority: string;
  priceCents: number;
  inventory: number;
  revenue: number;
  gdBalance: number;
  isBot: boolean;
  isActive: boolean;
  isFlashSale: boolean;
  isViral: boolean;
  payout: number;
}

export interface LedgerItem {
  id: string;
  time: string;
  type: "PRICE" | "TICK" | "AUCTION" | "VRF" | "SETTLE";
  message: string;
  signature: string;
  latencyMs: number;
  network: "ER" | "PER" | "Base";
}

export interface RevenueDataPoint {
  second: number;
  stall0: number;
  stall1: number;
  stall2: number;
  stall3: number;
}

export interface GameState {
  // Session & Wallet
  connected: boolean;
  playerPubkey: string;
  sessionKeypair: Keypair | null;
  localPlayerIndex: number; // 0..3

  // Round State
  roundId: number;
  status: "Lobby" | "Live" | "Ended" | "Settled";
  potLamports: number;
  stakeLamports: number;
  remainingSeconds: number;
  tick: number;
  totalCustomersSpawned: number;

  // Stalls
  stalls: StallData[];

  // Events & VRF
  activeEvent: EventType;
  eventTimeRemaining: number;
  eventMultiplier: number;

  // Auction Modal
  auctionActive: boolean;
  auctionId: number;
  auctionCountdown: number; // 10s down to 0
  auctionTargetInventory: number;
  mySubmittedBid: number | null;
  revealedBids: { bidderIndex: number; amount: number; isWinner: boolean }[];
  auctionPhase: "IDLE" | "BIDDING" | "SEALED" | "REVEALING" | "REVEALED";

  // UI features
  soundEnabled: boolean;
  cityLedger: LedgerItem[];
  revenueHistory: RevenueDataPoint[];
  showOnboarding: boolean;
  useCommitRevealFallback: boolean;

  // Actions
  setPlayerIndex: (idx: number) => void;
  initSessionKey: () => void;
  setLocalPrice: (priceCents: number) => void;
  submitAuctionBid: (amount: number) => void;
  addLedgerItem: (item: Omit<LedgerItem, "id" | "time">) => void;
  toggleSound: () => void;
  closeOnboarding: () => void;
  updateFromRoundAccount: (data: Partial<GameState>) => void;
  resetGame: () => void;
  startSoloDemoWithBots: () => void;
}

const DEFAULT_STALLS: StallData[] = [
  {
    index: 0,
    name: "Corner Roast (You)",
    authority: "7xKX...4aP1",
    priceCents: 300,
    inventory: 50,
    revenue: 0,
    gdBalance: 10000,
    isBot: false,
    isActive: true,
    isFlashSale: false,
    isViral: false,
    payout: 0,
  },
  {
    index: 1,
    name: "Undercutter Bot",
    authority: "Bot1...Undr",
    priceCents: 300,
    inventory: 50,
    revenue: 0,
    gdBalance: 10000,
    isBot: true,
    isActive: true,
    isFlashSale: false,
    isViral: false,
    payout: 0,
  },
  {
    index: 2,
    name: "Margin Hawk Bot",
    authority: "Bot2...Hawk",
    priceCents: 300,
    inventory: 50,
    revenue: 0,
    gdBalance: 10000,
    isBot: true,
    isActive: true,
    isFlashSale: false,
    isViral: false,
    payout: 0,
  },
  {
    index: 3,
    name: "Aggressive Bot",
    authority: "Bot3...Aggr",
    priceCents: 300,
    inventory: 50,
    revenue: 0,
    gdBalance: 10000,
    isBot: true,
    isActive: true,
    isFlashSale: false,
    isViral: false,
    payout: 0,
  },
];

export const useGameStore = create<GameState>((set, get) => ({
  connected: true,
  playerPubkey: "7xKXtgPqRzV398LwMqNm1",
  sessionKeypair: Keypair.generate(),
  localPlayerIndex: 0,

  roundId: 1,
  status: "Live",
  potLamports: 4_000_000, // 0.004 SOL total pot (0.001 SOL per player)
  stakeLamports: 1_000_000, // 0.001 SOL (ultra-low cost)
  remainingSeconds: 300,
  tick: 0,
  totalCustomersSpawned: 0,

  stalls: DEFAULT_STALLS,

  activeEvent: "Quiet",
  eventTimeRemaining: 0,
  eventMultiplier: 1.0,

  auctionActive: false,
  auctionId: 1,
  auctionCountdown: 0,
  auctionTargetInventory: 100,
  mySubmittedBid: null,
  revealedBids: [],
  auctionPhase: "IDLE",

  soundEnabled: true,
  cityLedger: [
    {
      id: "genesis",
      time: new Date().toLocaleTimeString(),
      type: "TICK",
      message: "Welcome to Bazaar. Connect a wallet to play on-chain.",
      signature: "welcome",
      latencyMs: 0,
      network: "Base",
    },
  ],
  revenueHistory: [{ second: 0, stall0: 0, stall1: 0, stall2: 0, stall3: 0 }],
  showOnboarding: false,
  useCommitRevealFallback: false,

  setPlayerIndex: (idx: number) => set({ localPlayerIndex: idx }),

  initSessionKey: () => {
    const kp = Keypair.generate();
    set({ sessionKeypair: kp });
  },

  setLocalPrice: (priceCents: number) => {
    const { stalls, localPlayerIndex } = get();
    const updated = [...stalls];
    if (updated[localPlayerIndex]) {
      updated[localPlayerIndex] = {
        ...updated[localPlayerIndex],
        priceCents,
      };
      set({ stalls: updated });
    }
  },

  submitAuctionBid: (amount: number) => {
    set({
      mySubmittedBid: amount,
      auctionPhase: "SEALED",
    });
  },

  addLedgerItem: (item) => {
    const newItem: LedgerItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
    };
    set((state) => ({
      cityLedger: [newItem, ...state.cityLedger.slice(0, 49)],
    }));
  },

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  closeOnboarding: () => set({ showOnboarding: false }),

  updateFromRoundAccount: (data) => set(data),

  resetGame: () =>
    set({
      roundId: get().roundId + 1,
      status: "Live",
      remainingSeconds: 300,
      tick: 0,
      totalCustomersSpawned: 0,
      stalls: DEFAULT_STALLS.map((s) => ({
        ...s,
        inventory: 50,
        revenue: 0,
        gdBalance: 10000,
      })),
      revenueHistory: [{ second: 0, stall0: 0, stall1: 0, stall2: 0, stall3: 0 }],
      auctionActive: false,
      auctionPhase: "IDLE",
    }),

  startSoloDemoWithBots: () => {
    set({
      status: "Live",
      remainingSeconds: 300,
      stalls: DEFAULT_STALLS,
    });
  },
}));
