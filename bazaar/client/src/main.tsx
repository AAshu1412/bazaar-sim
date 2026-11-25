import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { App } from "./App";
import { DEVNET_RPC_URL } from "./solana/router";
import { DevWalletAdapter } from "./solana/DevWalletAdapter";
import { gameChain } from "./solana/gameChain";
import "./index.css";

// the Pyth SDK expects a global Buffer in the browser
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

// Phantom, Solflare, Backpack… are discovered automatically through the Wallet Standard.
// The key-in-localStorage dev wallet exists only under `vite dev`.
const wallets = import.meta.env.DEV ? [new DevWalletAdapter()] : [];

if (import.meta.env.DEV) (window as unknown as { gameChain: typeof gameChain }).gameChain = gameChain; // debugging handle

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={DEVNET_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
