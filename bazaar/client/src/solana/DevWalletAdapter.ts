/**
 * Local-only test wallet (registered only in `vite dev`): a keypair kept in localStorage that signs without a
 * browser extension. It exists so the full connect → approve-once → play flow can be exercised against a local
 * validator. Production builds never register it.
 */
import { BaseMessageSignerWalletAdapter, WalletReadyState, WalletNotConnectedError, type WalletName } from "@solana/wallet-adapter-base";
import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

const KEY = "bazaar.devwallet";
export const DevWalletName = "Dev Wallet" as WalletName<"Dev Wallet">;

export class DevWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = DevWalletName;
  url = "https://localhost";
  icon = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#d4a359"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="#1c1815" font-family="monospace">DEV</text></svg>');
  supportedTransactionVersions = new Set(["legacy", 0] as const);
  private _kp: Keypair | null = null;
  private _connecting = false;

  get publicKey(): PublicKey | null { return this._kp?.publicKey ?? null; }
  get connecting() { return this._connecting; }
  get readyState() { return WalletReadyState.Installed; }

  async connect() {
    if (this._kp) return;
    this._connecting = true;
    const saved = localStorage.getItem(KEY);
    this._kp = saved ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved))) : Keypair.generate();
    if (!saved) localStorage.setItem(KEY, JSON.stringify(Array.from(this._kp.secretKey)));
    this._connecting = false;
    this.emit("connect", this._kp.publicKey);
  }
  async disconnect() {
    this._kp = null;
    this.emit("disconnect");
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (!this._kp) throw new WalletNotConnectedError();
    if ("version" in tx) tx.sign([this._kp]);
    else tx.partialSign(this._kp);
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }
  async signMessage(_m: Uint8Array): Promise<Uint8Array> {
    throw new Error("Dev wallet does not sign messages");
  }
}
