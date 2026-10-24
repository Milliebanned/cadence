import type { AddressInfo } from "./types.ts";

/** What the agent needs from a Zcash wallet. A real adapter wraps a light-client
 *  wallet; the agent never sees keys, it only asks for a shielded send. */
export interface WalletAdapter {
  inspectAddress(address: string): Promise<AddressInfo>;
  /** Must send shielded-to-shielded only and fail rather than fall back to transparent. */
  sendShielded(address: string, amountZat: number, memo: string): Promise<{ txid: string }>;
}

export interface SentRecord {
  address: string;
  amountZat: number;
  memo: string;
  txid: string;
}

/** In-memory wallet for tests and local demos. */
export class MockWallet implements WalletAdapter {
  readonly sent: SentRecord[] = [];
  failNext = false;
  private readonly infoFor: (address: string) => AddressInfo;

  constructor(infoFor?: (address: string) => AddressInfo) {
    this.infoFor =
      infoFor ??
      ((a) => ({
        network: a.startsWith("utest1") ? "test" : "main",
        receivers: a.includes("t") && a.startsWith("tm") ? ["transparent"] : ["orchard"],
      }));
  }

  async inspectAddress(address: string): Promise<AddressInfo> {
    return this.infoFor(address);
  }

  async sendShielded(address: string, amountZat: number, memo: string): Promise<{ txid: string }> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("send failed");
    }
    const txid = `mock-${this.sent.length + 1}`;
    this.sent.push({ address, amountZat, memo, txid });
    return { txid };
  }
}
