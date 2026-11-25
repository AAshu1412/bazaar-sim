/**
 * On-chain game client. The player's real wallet signs exactly once, to authorise a MagicBlock session key
 * (and top it up with a little SOL for fees). Every game transaction after that is signed by the session key:
 * no wallet popups. GD is an SPL token owned by the program (minted on join); the town's customers pay shops
 * from the season treasury via serve_customers.
 */
import {
  ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { HermesClient } from "@pythnetwork/hermes-client";
import { PROGRAM_ID, router } from "./router";
import { IX } from "./idlSpec";
import { SOL_FEED_ID, BTC_FEED_ID, hermesUrl } from "./pyth";

export const SESSION_PROGRAM_ID = new PublicKey("KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const GD_UNIT = 100; // raw units per GD (mint has 2 decimals)
const SEASON_ID = 1n;
const PLOT_ID = 0;
const SESSION_TOPUP = 0.04 * LAMPORTS_PER_SOL; // covers ~0.013 SOL of account rent + thousands of tx fees
const WALLET_NEEDS = SESSION_TOPUP + 0.004 * LAMPORTS_PER_SOL; // + session-token rent + fee
const SESSION_DAYS = 6;
const LOW_SESSION_SOL = 0.01 * LAMPORTS_PER_SOL;
const SESSION_DISC_CREATE = [242, 193, 143, 179, 150, 25, 122, 227];
const SESSION_DISC_REVOKE = [86, 92, 198, 120, 144, 2, 7, 194];

export interface WalletLike {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}
export type Phase = "disconnected" | "connecting" | "needs-session" | "setting-up" | "live" | "error";
export interface ChainState {
  phase: Phase;
  wallet?: string;
  sessionSol: number;
  gd: number; // whole GD
  inventory: number;
  priceCents: number;
  upgrades: number;
  lifetimeRevenueGd: number;
  customersServed: number;
  pendingSales: number;
  detail?: string;
}
export interface TxLog { message: string; signature: string; latencyMs: number; isLive: boolean }
type Log = (kind: "PRICE" | "TICK" | "AUCTION" | "VRF" | "SETTLE", r: TxLog) => void;

const u64 = (n: bigint | number) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const i64 = (n: number | bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };

const EMPTY: ChainState = { phase: "disconnected", sessionSol: 0, gd: 0, inventory: 0, priceCents: 275, upgrades: 0, lifetimeRevenueGd: 0, customersServed: 0, pendingSales: 0 };

export class GameChain {
  private conn: Connection = router.baseConn;
  private wallet: WalletLike | null = null;
  private session: Keypair | null = null;
  private authority!: PublicKey;
  private listeners = new Set<() => void>();
  private state: ChainState = { ...EMPTY };
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private saleTimer: ReturnType<typeof setTimeout> | null = null;
  private priceTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = 0;
  private flushing = false;
  private queue: Promise<unknown> = Promise.resolve();
  private log: Log = () => {};
  private runId = 0;

  // ---------- PDAs ----------
  private pda = (seeds: (Buffer | Uint8Array)[], program = PROGRAM_ID) => PublicKey.findProgramAddressSync(seeds, program)[0];
  get season() { return this.pda([Buffer.from("season"), this.authority.toBuffer(), u64(SEASON_ID)]); }
  get gdMint() { return this.pda([Buffer.from("gdmint"), this.season.toBuffer()]); }
  get treasury() { return this.pda([Buffer.from("treasury"), this.season.toBuffer()]); }
  get playerPda() { return this.pda([Buffer.from("player"), this.season.toBuffer(), this.authority.toBuffer()]); }
  get playerGd() { return this.pda([Buffer.from("gd"), this.season.toBuffer(), this.authority.toBuffer()]); }
  get plot() { return this.pda([Buffer.from("plot"), this.season.toBuffer(), u16(PLOT_ID)]); }
  get business() { return this.pda([Buffer.from("business"), this.plot.toBuffer()]); }
  get signals() { return this.pda([Buffer.from("signals"), this.season.toBuffer()]); }
  get sessionToken() {
    return this.pda([Buffer.from("session_token"), PROGRAM_ID.toBuffer(), this.session!.publicKey.toBuffer(), this.authority.toBuffer()], SESSION_PROGRAM_ID);
  }

  // ---------- store ----------
  getState = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private set(p: Partial<ChainState>) { this.state = { ...this.state, ...p }; this.listeners.forEach((f) => f()); }
  get live() { return this.state.phase === "live"; }
  get sessionAddress() { return this.session?.publicKey.toBase58(); }

  // ---------- instruction building ----------
  private ix(name: string, args: Buffer, keys: Record<string, PublicKey>): TransactionInstruction {
    const spec = IX[name];
    return new TransactionInstruction({
      programId: PROGRAM_ID,
      data: Buffer.concat([Buffer.from(spec.disc), args]),
      keys: spec.accounts.map(([n, writable, signer]) => ({ pubkey: keys[n], isWritable: writable, isSigner: signer })),
    });
  }
  /** the account set shared by every authority-scoped instruction */
  private common(extra: Record<string, PublicKey> = {}): Record<string, PublicKey> {
    return {
      season: this.season, authority: this.authority, session_token: this.sessionToken, signer: this.session!.publicKey,
      token_program: TOKEN_PROGRAM_ID, system_program: SystemProgram.programId, treasury: this.treasury,
      gd_mint: this.gdMint, player_gd: this.playerGd, owner_gd: this.playerGd, player: this.playerPda,
      plot: this.plot, business: this.business, ...extra,
    };
  }

  // ---------- sending (session key signs; wallet never involved) ----------
  private async send(ixs: TransactionInstruction[], cu = 300_000): Promise<string> {
    const s = this.session!;
    const tx = new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ...ixs);
    const { blockhash, lastValidBlockHeight } = await this.conn.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = s.publicKey;
    tx.sign(s);
    const sig = await this.conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
    const res = await this.conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    if (res.value.err) throw new Error(`transaction failed: ${JSON.stringify(res.value.err)}`);
    return sig;
  }
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn, fn);
    this.queue = p.catch(() => {});
    return p;
  }
  private async timed(kind: Parameters<Log>[0], message: string, fn: () => Promise<string>) {
    const t0 = performance.now();
    const signature = await fn();
    this.log(kind, { message, signature, latencyMs: Math.round(performance.now() - t0), isLive: true });
    return signature;
  }

  // ---------- connect / session ----------
  private loadSession(wallet: PublicKey): Keypair {
    const key = `bazaar.session.${wallet.toBase58()}`;
    const saved = localStorage.getItem(key);
    if (saved) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
    const kp = Keypair.generate();
    localStorage.setItem(key, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
  }
  private async sessionStatus(): Promise<"ok" | "missing" | "low"> {
    const [tok, bal] = await Promise.all([this.conn.getAccountInfo(this.sessionToken), this.conn.getBalance(this.session!.publicKey)]);
    this.set({ sessionSol: bal / LAMPORTS_PER_SOL });
    if (!tok) return "missing";
    const validUntil = Number(tok.data.readBigInt64LE(8 + 32 * 3));
    if (validUntil < Date.now() / 1000 + 3600 || bal < LOW_SESSION_SOL) return "low";
    return "ok";
  }

  async connect(wallet: WalletLike, log: Log) {
    const run = ++this.runId;
    this.log = log;
    this.wallet = wallet;
    this.authority = wallet.publicKey;
    this.session = this.loadSession(wallet.publicKey);
    this.set({ ...EMPTY, phase: "connecting", wallet: wallet.publicKey.toBase58() });
    try {
      const st = await this.sessionStatus();
      if (run !== this.runId) return;
      if (st !== "ok") { this.set({ phase: "needs-session", detail: st === "low" ? "Session expired or low on SOL" : "Approve once to start your session" }); return; }
      await this.startPlaying(run);
    } catch (e) { this.fail(e); }
  }

  /** The single wallet approval: authorise the session key and top it up with SOL for fees. */
  async startSession() {
    if (!this.wallet || !this.session) return;
    const run = this.runId;
    try {
      const s = this.session, auth = this.authority;
      // pre-flight, so a missing balance is explained here instead of surfacing as a wallet "simulation failed"
      const walletBal = await this.conn.getBalance(auth);
      if (walletBal < WALLET_NEEDS) {
        throw new Error(`Your wallet has ${(walletBal / LAMPORTS_PER_SOL).toFixed(3)} SOL on devnet but the session needs about ${(WALLET_NEEDS / LAMPORTS_PER_SOL).toFixed(3)}. Get devnet SOL at faucet.solana.com, and make sure your wallet is set to Devnet.`);
      }
      this.set({ phase: "connecting", detail: "Waiting for wallet approval…" });
      const ixs: TransactionInstruction[] = [];
      const existing = await this.conn.getAccountInfo(this.sessionToken);
      if (existing) {
        ixs.push(new TransactionInstruction({
          programId: SESSION_PROGRAM_ID, data: Buffer.from(SESSION_DISC_REVOKE),
          keys: [
            { pubkey: this.sessionToken, isSigner: false, isWritable: true },
            { pubkey: auth, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
        }));
      }
      const validUntil = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
      ixs.push(new TransactionInstruction({
        programId: SESSION_PROGRAM_ID,
        // create_session(top_up: Some(true), valid_until: Some(i64), lamports: Some(u64))
        data: Buffer.concat([Buffer.from(SESSION_DISC_CREATE), Buffer.from([1, 1]), Buffer.from([1]), i64(validUntil), Buffer.from([1]), u64(SESSION_TOPUP)]),
        keys: [
          { pubkey: this.sessionToken, isSigner: false, isWritable: true },
          { pubkey: s.publicKey, isSigner: true, isWritable: true },
          { pubkey: auth, isSigner: true, isWritable: true },
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
      }));
      const tx = new Transaction().add(...ixs);
      const { blockhash, lastValidBlockHeight } = await this.conn.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = auth;
      tx.partialSign(s);
      const signed = await this.wallet.signTransaction(tx); // ← the one and only wallet prompt
      const sig = await this.conn.sendRawTransaction(signed.serialize());
      const res = await this.conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      if (res.value.err) throw new Error(`session creation failed: ${JSON.stringify(res.value.err)}`);
      this.log("TICK", { message: "Session key authorised (one wallet approval, no more popups)", signature: sig, latencyMs: 0, isLive: true });
      await this.startPlaying(run);
    } catch (e) { this.fail(e, "needs-session"); }
  }

  private fail(e: unknown, phase: Phase = "error") {
    let msg = e instanceof Error ? e.message : String(e);
    if (/simulat|blockhash|network/i.test(msg) && !/devnet/i.test(msg)) msg += " (is your wallet set to Devnet? Phantom: Settings > Developer Settings > Testnet Mode > Solana Devnet)";
    console.warn("[chain]", e);
    this.set({ phase, detail: msg.length > 260 ? msg.slice(0, 260) + "…" : msg });
  }

  private async startPlaying(run: number) {
    this.set({ phase: "setting-up", detail: "Creating your season, GD wallet and shop…" });
    await this.bootstrap();
    if (run !== this.runId) return;
    await this.refresh();
    this.set({ phase: "live", detail: undefined });
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refresh().catch(() => {}), 3000);
  }

  disconnect() {
    this.runId++;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.saleTimer) clearTimeout(this.saleTimer);
    this.pollTimer = this.saleTimer = null;
    this.pending = 0;
    this.wallet = null;
    this.set({ ...EMPTY });
  }

  /** Create season + GD mint/treasury, join (mints 10,000 GD), plot, claim, open shop. Skips what exists. */
  private async bootstrap() {
    const [season, player, business, plot] = await this.conn.getMultipleAccountsInfo([this.season, this.playerPda, this.business, this.plot]);
    const c = this.common();
    if (!season) {
      await this.timed("TICK", "Season created, GD token minted, town treasury funded", () =>
        this.send([this.ix("create_season", Buffer.concat([u64(SEASON_ID), u64(1), u64(0)]), c)], 400_000));
    }
    if (!player) {
      await this.timed("TICK", "Joined season: 10,000 GD minted to your wallet", () => this.send([this.ix("join_season", Buffer.alloc(0), c)], 400_000));
    }
    if (!business) {
      const ixs: TransactionInstruction[] = [];
      if (!plot) ixs.push(this.ix("initialize_plot", Buffer.concat([u64(SEASON_ID), u16(PLOT_ID), Buffer.from([2, 0, 0])]), c)); // MainStreet
      const plotInfo = plot ? await this.conn.getAccountInfo(this.plot) : null;
      const owned = plotInfo ? !plotInfo.data.subarray(8 + 8 + 2 + 3).slice(0, 1).equals(Buffer.from([0])) : false;
      if (!owned) ixs.push(this.ix("claim_plot", Buffer.alloc(0), c));
      ixs.push(this.ix("open_business", Buffer.concat([Buffer.from([0]), u16(275)]), c)); // CoffeeCart at $2.75 (competitive with the town)
      await this.timed("TICK", "Plot claimed (3,000 GD) and Corner Roast opened (2,000 GD)", () => this.send(ixs, 600_000));
    }
  }

  // ---------- reading chain state ----------
  async refresh() {
    if (!this.session) return;
    const [gdAcc, bizAcc, ownAcc, bal] = await Promise.all([
      this.conn.getAccountInfo(this.playerGd), this.conn.getAccountInfo(this.business), this.conn.getAccountInfo(this.playerPda), this.conn.getBalance(this.session.publicKey),
    ]);
    const next: Partial<ChainState> = { sessionSol: bal / LAMPORTS_PER_SOL, pendingSales: this.pending };
    if (gdAcc) next.gd = Number(gdAcc.data.readBigUInt64LE(64)) / GD_UNIT; // SPL token account: amount @ offset 64
    if (bizAcc) {
      const d = bizAcc.data;
      let o = 8 + 8 + 32 + 32 + 1; // disc, season_id, plot, owner, kind
      next.priceCents = d.readUInt16LE(o); o += 2;
      next.upgrades = d[o]; o += 1;
      o += d[o] === 1 ? 33 : 1; // Option<Pubkey> manager
      o += 8 + 24; // revenue_today, revenue_trailing_3d
      next.inventory = d.readUInt32LE(o); o += 4;
      o += 2; // unit_cost_cents
      next.lifetimeRevenueGd = Number(d.readBigUInt64LE(o)) / GD_UNIT;
    }
    if (ownAcc) next.customersServed = Number(ownAcc.data.readBigUInt64LE(8 + 32 + 32 + 1 + 8));
    this.set(next);
  }

  // ---------- gameplay actions (all session-signed) ----------
  setPrice(priceCents: number) {
    if (!this.live) return;
    if (this.priceTimer) clearTimeout(this.priceTimer);
    this.priceTimer = setTimeout(() => this.enqueue(async () => {
      try {
        await this.timed("PRICE", `Stall #0 repriced to $${(priceCents / 100).toFixed(2)} on-chain`, () =>
          this.send([this.ix("set_business_price", u16(priceCents), this.common())], 100_000));
        this.set({ priceCents });
      } catch (e) { this.fail(e, "live"); }
    }), 600);
  }
  restock(units: number) {
    return this.enqueue(async () => {
      await this.timed("TICK", `Restocked ${units} units`, () => this.send([this.ix("restock", u32(units), this.common())], 150_000));
      await this.refresh();
    });
  }
  buyUpgrade(flag: number, label: string) {
    return this.enqueue(async () => {
      await this.timed("TICK", `Upgrade bought: ${label}`, () => this.send([this.ix("buy_upgrade", Buffer.from([flag]), this.common())], 150_000));
      await this.refresh();
    });
  }
  /** A simulated townsperson walked out of the shop: queue it; sales are paid on-chain in small batches. */
  recordSale() {
    if (!this.live) return;
    this.pending++;
    this.set({ pendingSales: this.pending });
    if (!this.saleTimer) this.saleTimer = setTimeout(() => this.flushSales(), 2500);
  }
  private flushSales() {
    this.saleTimer = null;
    if (this.flushing || this.pending === 0) return;
    const n = Math.min(this.pending, 20);
    this.pending -= n;
    this.flushing = true;
    const price = this.state.priceCents;
    this.enqueue(async () => {
      try {
        await this.timed("TICK", `${n} customer${n > 1 ? "s" : ""} paid $${((n * price) / 100).toFixed(2)} GD`, () =>
          this.send([this.ix("serve_customers", u16(n), this.common())], 200_000));
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        this.log("TICK", { message: /OutOfStock|0x1780|6016/i.test(m) ? "Sold out: restock to keep serving customers" : `Sale failed: ${m.slice(0, 80)}`, signature: "sim-sale", latencyMs: 0, isLive: false });
      } finally {
        this.flushing = false;
        await this.refresh().catch(() => {});
        if (this.pending > 0 && !this.saleTimer) this.saleTimer = setTimeout(() => this.flushSales(), 800);
      }
    });
  }

  // ---------- Pyth crank (permissionless; posts fresh SOL/BTC updates, then applies signals) ----------
  async crankSignals(hermes = new HermesClient(hermesUrl())) {
    if (!this.live) return;
    const t0 = performance.now();
    try {
      const { PythSolanaReceiver } = await import("@pythnetwork/pyth-solana-receiver");
      const kp = this.session!;
      const wallet = {
        publicKey: kp.publicKey, payer: kp,
        signTransaction: async (t: any) => { if ("version" in t) t.sign([kp]); else t.partialSign(kp); return t; },
        signAllTransactions: async (ts: any[]) => ts.map((t) => { if ("version" in t) t.sign([kp]); else t.partialSign(kp); return t; }),
      };
      const receiver = new PythSolanaReceiver({ connection: this.conn, wallet: wallet as any });
      const updates = (await hermes.getLatestPriceUpdates([SOL_FEED_ID, BTC_FEED_ID], { encoding: "base64" })).binary.data;
      const builder = receiver.newTransactionBuilder({ closeUpdateAccounts: true });
      await builder.addPostPriceUpdates(updates);
      await builder.addPriceConsumerInstructions(async (getAcc) => {
        const spec = IX["apply_market_signals"];
        const keys: Record<string, PublicKey> = { season: this.season, signals: this.signals, sol_feed: getAcc(SOL_FEED_ID), btc_feed: getAcc(BTC_FEED_ID), cranker: kp.publicKey, system_program: SystemProgram.programId };
        return [{ instruction: new TransactionInstruction({ programId: PROGRAM_ID, data: Buffer.from(spec.disc), keys: spec.accounts.map(([n, w, s]) => ({ pubkey: keys[n], isWritable: w, isSigner: s })) }), signers: [] }];
      });
      const txs = await builder.buildVersionedTransactions({ computeUnitPriceMicroLamports: 50_000 });
      const sigs = await receiver.provider.sendAll(txs, { skipPreflight: true });
      this.log("TICK", { message: "Pyth market signals applied on-chain", signature: sigs[sigs.length - 1], latencyMs: Math.round(performance.now() - t0), isLive: true });
    } catch (e) {
      this.log("TICK", { message: `Pyth signals not applied: ${String((e as { message?: string })?.message ?? e).slice(0, 80)}`, signature: "sim-pyth", latencyMs: 0, isLive: false });
    }
  }
}

export const gameChain = new GameChain();
