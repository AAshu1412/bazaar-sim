import { Connection, PublicKey } from "@solana/web3.js";

// Pyth sponsored push-feed accounts (PriceUpdateV2). Same addresses on every cluster, but only
// mainnet's SOL/USD is updated every few seconds; devnet's are hours stale.
export const SOL_USD_FEED = new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");
export const BTC_USD_FEED = new PublicKey("4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo");

const mainnet = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
const HISTORY_KEY = "bazaar.solHistory";
const HOUR_MS = 3_600_000;

export interface PythSol {
  price: number;
  /** % move vs the oldest sample within the last hour (0 until we have a second sample) */
  change1hPct: number;
  ageSecs: number;
}

/** Layout: disc8 | write_authority32 | verification(Full=1B, Partial=2B) | feed_id32 | price i64 | conf u64 | expo i32 | publish_time i64 */
export function parsePriceUpdateV2(d: Uint8Array): { price: number; ageSecs: number } {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const off = 8 + 32 + (d[40] === 0 ? 2 : 1) + 32;
  const price = Number(v.getBigInt64(off, true)) * 10 ** v.getInt32(off + 16, true);
  const publishTime = Number(v.getBigInt64(off + 20, true));
  return { price, ageSecs: Math.max(0, Math.floor(Date.now() / 1000) - publishTime) };
}

/** Live SOL/USD straight from Pyth's on-chain feed; no API key needed. 1h change is sampled locally. */
export async function fetchSolPrice(): Promise<PythSol> {
  const acc = await mainnet.getAccountInfo(SOL_USD_FEED);
  if (!acc) throw new Error("Pyth SOL/USD feed account missing");
  const { price, ageSecs } = parsePriceUpdateV2(acc.data);

  const now = Date.now();
  const hist: [number, number][] = (JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as [number, number][])
    .filter(([t]) => now - t < HOUR_MS);
  const ref = hist[0]?.[1] ?? price;
  hist.push([now, price]);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(-240)));

  return { price, ageSecs, change1hPct: ((price - ref) / ref) * 100 };
}
