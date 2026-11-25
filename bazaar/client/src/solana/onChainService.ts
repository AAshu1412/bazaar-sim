import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { PROGRAM_ID, router } from "./router";
import { BTC_USD_FEED, SOL_USD_FEED } from "./pyth";

const KEY_STORAGE = "bazaar.burner";
const SEASON_STORAGE = "bazaar.season";
const PLOT_ID = 0; // the local player's stall
const MIN_LAMPORTS = 0.02 * LAMPORTS_PER_SOL;

export interface TxResult {
  signature: string;
  latencyMs: number;
  isLive: boolean;
}
type Log = (msg: string, r: TxResult) => void;

/** Anchor ix discriminator: sha256("global:<name>")[..8] */
async function disc(name: string): Promise<Buffer> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`global:${name}`));
  return Buffer.from(new Uint8Array(h).slice(0, 8));
}
const u64 = (n: number | bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const u16 = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};

/**
 * Real devnet calls against the deployed bazaar program, signed by a localStorage burner key.
 * Any failure (no airdrop, RPC down) degrades to isLive:false so the game keeps playing.
 */
export class OnChainService {
  public readonly burner: Keypair;
  public readonly seasonId: number;
  private ready: Promise<boolean> | null = null;
  private businessPda: PublicKey | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const saved = localStorage.getItem(KEY_STORAGE);
    this.burner = saved
      ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)))
      : Keypair.generate();
    if (!saved) localStorage.setItem(KEY_STORAGE, JSON.stringify(Array.from(this.burner.secretKey)));

    this.seasonId = Number(localStorage.getItem(SEASON_STORAGE)) || Date.now();
    localStorage.setItem(SEASON_STORAGE, String(this.seasonId));
  }

  private async send(ixs: TransactionInstruction[]): Promise<string> {
    return sendAndConfirmTransaction(router.baseConn, new Transaction().add(...ixs), [this.burner], {
      commitment: "confirmed",
    });
  }

  private ix(data: Buffer, keys: TransactionInstruction["keys"]) {
    return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  }

  /** Idempotent: fund burner, then create season → plot → lease → business if missing. */
  public bootstrap(log: Log): Promise<boolean> {
    this.ready ??= this.doBootstrap(log).catch((e) => {
      log(`On-chain setup skipped: ${(e as Error).message}`, { signature: "sim-setup", latencyMs: 0, isLive: false });
      this.ready = null; // allow retry on next reprice
      return false;
    });
    return this.ready;
  }

  private async doBootstrap(log: Log): Promise<boolean> {
    const conn = router.baseConn;
    const me = this.burner.publicKey;
    const t0 = performance.now();
    const step = (msg: string, signature: string) =>
      log(msg, { signature, latencyMs: Math.round(performance.now() - t0), isLive: true });

    // devnet RPC faucet is closed: user must fund the burner at https://faucet.solana.com
    if ((await conn.getBalance(me)) < MIN_LAMPORTS)
      throw new Error(`fund burner ${me.toBase58()} with devnet SOL at faucet.solana.com`);

    const season = router.getSeasonPDA(this.seasonId);
    const plot = router.getPlotPDA(this.seasonId, PLOT_ID);
    const business = router.getBusinessPDA(plot);
    this.businessPda = business;
    const sys = { pubkey: SystemProgram.programId, isSigner: false, isWritable: false };

    if (!(await conn.getAccountInfo(season))) {
      const data = Buffer.concat([await disc("create_season"), u64(this.seasonId), u64(1), u64(0)]);
      step("Season created on Solana", await this.send([this.ix(data, [w(season), w(me, true), sys])]));
    }
    if (!(await conn.getAccountInfo(plot))) {
      // tier MainStreet=2, street 1, position 0
      const data = Buffer.concat([
        await disc("initialize_plot"), u64(this.seasonId), u16(PLOT_ID), Buffer.from([2, 1, 0]),
      ]);
      const sig = await this.send([
        this.ix(data, [ro(season), w(plot), w(me, true), sys]),
        this.ix(await disc("claim_plot"), [w(plot), { pubkey: me, isSigner: true, isWritable: false }]),
      ]);
      step("Plot #0 initialized and claimed", sig);
    }
    if (!(await conn.getAccountInfo(business))) {
      const data = Buffer.concat([await disc("open_business"), Buffer.from([0]), u16(300)]); // CoffeeCart @ $3.00
      step("Corner Roast business opened", await this.send([this.ix(data, [w(business), w(plot), w(me, true), sys])]));
    }
    return true;
  }

  /** Permissionless crank: program reads Pyth PriceUpdateV2 accounts and stores SOL move / BTC volatility. */
  public async crankMarketSignals(log: Log): Promise<void> {
    const start = performance.now();
    try {
      if (!(await this.bootstrap(log))) throw new Error("not bootstrapped");
      const me = this.burner.publicKey;
      const sys = { pubkey: SystemProgram.programId, isSigner: false, isWritable: false };
      const sig = await this.send([
        this.ix(await disc("apply_market_signals"), [
          ro(router.getSeasonPDA(this.seasonId)), w(router.getSignalsPDA(this.seasonId)),
          ro(SOL_USD_FEED), ro(BTC_USD_FEED), w(me, true), sys,
        ]),
      ]);
      log("Pyth market signals applied on-chain", { signature: sig, latencyMs: Math.round(performance.now() - start), isLive: true });
    } catch (e) {
      log(`Pyth market signals not applied: ${(e as Error).message}`, { signature: "sim-pyth", latencyMs: 0, isLive: false });
    }
  }

  /** Debounced real set_business_price; slider spam collapses into one tx. Resolves with the final result. */
  public setPriceOnChain(priceCents: number, log: Log): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      const start = performance.now();
      try {
        if (!(await this.bootstrap(log)) || !this.businessPda) throw new Error("not bootstrapped");
        const data = Buffer.concat([await disc("set_business_price"), u16(priceCents)]);
        const sig = await this.send([
          this.ix(data, [w(this.businessPda), { pubkey: this.burner.publicKey, isSigner: true, isWritable: false }]),
        ]);
        log(`Stall #0 repriced to $${(priceCents / 100).toFixed(2)} on-chain`, {
          signature: sig, latencyMs: Math.round(performance.now() - start), isLive: true,
        });
      } catch (e) {
        log(`Stall #0 repriced to $${(priceCents / 100).toFixed(2)} (simulated: ${(e as Error).message})`, {
          signature: "sim-" + Math.random().toString(36).slice(2, 10),
          latencyMs: Math.round(performance.now() - start), isLive: false,
        });
      }
    }, 600);
  }
}

const w = (pubkey: PublicKey, isSigner = false) => ({ pubkey, isSigner, isWritable: true });
const ro = (pubkey: PublicKey, isSigner = false) => ({ pubkey, isSigner, isWritable: false });

export const onChainService = new OnChainService();
