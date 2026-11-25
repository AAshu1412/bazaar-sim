// Must be imported first: the MagicBlock and Pyth SDKs read a global Buffer while their modules load.
import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
