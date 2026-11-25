import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

// Base-layer devnet through MagicBlock's RPC (the public api.devnet.solana.com rate-limits the game's polling).
// VITE_RPC_URL points the game elsewhere, e.g. at a local validator for testing.
export const DEVNET_RPC_URL: string =
  (import.meta as any).env?.VITE_RPC_URL ?? "https://rpc.magicblock.app/devnet";
// VITE_ER_URL points the game at a local ephemeral validator (or another region) for testing
export const ER_RPC_URL: string = (import.meta as any).env?.VITE_ER_URL ?? "https://devnet.magicblock.app";
export const ER_ENABLED: boolean = (import.meta as any).env?.VITE_ER !== "off";
export const PRIVATE_ER_RPC_URL = "https://devnet-per.magicblock.app";

export const PROGRAM_ID = new PublicKey(
  "GT36pVzQ6NczDeJaL317uGsx1fT1SaKpvSvzUjaPqKTb"
);

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
 * Connections + PDA helpers matching programs/bazaar (seeds: season, plot, business).
 * The deployed program lives on base devnet; ER/PER conns are kept for delegation later.
 */
export class ConnectionRouter {
  public baseConn = new Connection(DEVNET_RPC_URL, "confirmed");
  public erConn = new Connection(ER_RPC_URL, "confirmed");
  public perConn = new Connection(PRIVATE_ER_RPC_URL, "confirmed");

  public getSeasonPDA(seasonId: number | bigint): PublicKey {
    return PublicKey.findProgramAddressSync([Buffer.from("season"), u64(seasonId)], PROGRAM_ID)[0];
  }

  public getSignalsPDA(seasonId: number | bigint): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("signals"), this.getSeasonPDA(seasonId).toBuffer()],
      PROGRAM_ID
    )[0];
  }

  public getPlotPDA(seasonId: number | bigint, plotId: number): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("plot"), u64(seasonId), u16(plotId)],
      PROGRAM_ID
    )[0];
  }

  public getBusinessPDA(plot: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync([Buffer.from("business"), plot.toBuffer()], PROGRAM_ID)[0];
  }
}

export const router = new ConnectionRouter();
