import { HermesClient } from "@pythnetwork/hermes-client";

export const SOL_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
export const BTC_FEED_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

// Hermes needs an API key; the vite dev/preview proxy at /hermes injects it (vite.config.ts).
export const hermesUrl = () =>
  typeof location !== "undefined" ? `${location.origin}/hermes` : "https://hermes.pyth.network";

export interface PythSol {
  price: number;
  /** real % move vs the Pyth price one hour ago */
  change1hPct: number;
}

const usd = (p: { price: string; expo: number }) => Number(p.price) * 10 ** p.expo;

export async function fetchSolPrice(hermes = new HermesClient(hermesUrl())): Promise<PythSol> {
  const hourAgo = Math.floor(Date.now() / 1000) - 3600;
  const [now, then] = await Promise.all([
    hermes.getLatestPriceUpdates([SOL_FEED_ID], { parsed: true }),
    hermes.getPriceUpdatesAtTimestamp(hourAgo, [SOL_FEED_ID], { parsed: true }),
  ]);
  const price = usd(now.parsed![0].price);
  const ref = usd(then.parsed![0].price);
  return { price, change1hPct: ((price - ref) / ref) * 100 };
}
