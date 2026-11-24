import { Connection, PublicKey } from "@solana/web3.js";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const ER_RPC_URL = "https://devnet.magicblock.app";
export const PRIVATE_ER_RPC_URL = "https://devnet-per.magicblock.app";

export const PROGRAM_ID = new PublicKey(
  "394dL2jzTtXjc3tWKTL2cPYyS7rcADAM338FbVumWSSi"
);

/**
 * Three-tier connection router:
 * 1. Base Layer (Devnet): initialize_round, join_round, delegate_round, commit_and_settle
 * 2. Ephemeral Rollup (ER): set_price, advance_tick, trigger_event, open_auction, end_round
 * 3. Private ER (TDX): submit_bid, reveal_bids
 */
export class ConnectionRouter {
  public baseConn: Connection;
  public erConn: Connection;
  public perConn: Connection;

  constructor() {
    this.baseConn = new Connection(DEVNET_RPC_URL, "confirmed");
    this.erConn = new Connection(ER_RPC_URL, "confirmed");
    this.perConn = new Connection(PRIVATE_ER_RPC_URL, "confirmed");
  }

  public getRoundPDA(roundId: number): [PublicKey, number] {
    const roundBuffer = Buffer.alloc(8);
    roundBuffer.writeBigUInt64LE(BigInt(roundId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("round"), roundBuffer],
      PROGRAM_ID
    );
  }

  public getAuctionPDA(roundId: number, auctionId: number): [PublicKey, number] {
    const roundBuffer = Buffer.alloc(8);
    roundBuffer.writeBigUInt64LE(BigInt(roundId));
    const auctionBuffer = Buffer.alloc(8);
    auctionBuffer.writeBigUInt64LE(BigInt(auctionId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), roundBuffer, auctionBuffer],
      PROGRAM_ID
    );
  }
}

export const router = new ConnectionRouter();
