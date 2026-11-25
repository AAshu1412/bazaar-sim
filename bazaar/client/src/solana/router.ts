import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const ER_RPC_URL = "https://devnet.magicblock.app";
export const PRIVATE_ER_RPC_URL = "https://devnet-per.magicblock.app";

export const PROGRAM_ID = new PublicKey(
  "394dL2jzTtXjc3tWKTL2cPYyS7rcADAM338FbVumWSSi"
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
