import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AddressInfo, Network } from "./types.ts";
import type { WalletAdapter } from "./wallet.ts";

const run = promisify(execFile);

export interface Balance {
  chainTip: number;
  shieldedSpendableZat: number;
  transparentSpendableZat: number;
  totalZat: number;
}

/** ZIP 317: 5,000 zatoshis per logical action, at least two actions. A send from a
 *  fragmented wallet can need more; this is only the floor used for the balance guard. */
export const MIN_FEE_ZAT = 10_000;

export function parseInspect(text: string): AddressInfo {
  const net = /Network:\s*(\w+)/.exec(text)?.[1];
  const network: Network | null = net === "testnet" ? "test" : net === "mainnet" ? "main" : null;
  if (!network) throw new Error("not a Zcash address");
  const kind = /Kind:\s*(.+)/.exec(text)?.[1]?.trim() ?? "";
  const receivers = new Set<AddressInfo["receivers"][number]>();
  if (/^Transparent/i.test(kind)) receivers.add("transparent");
  if (/^Sapling/i.test(kind)) receivers.add("sapling");
  if (/Unified/i.test(kind)) {
    if (/-\s*Orchard\b/.test(text)) receivers.add("orchard");
    if (/-\s*Sapling\b/.test(text)) receivers.add("sapling");
    if (/-\s*(Transparent|P2PKH|P2SH)\b/i.test(text)) receivers.add("transparent");
  }
  return { network, receivers: [...receivers] };
}

export function parseBalance(json: string): Balance {
  const b = JSON.parse(json) as Record<string, number>;
  const shielded = (b.orchard_spendable ?? 0) + (b.ironwood_spendable ?? 0) + (b.sapling_spendable ?? 0);
  return {
    chainTip: b.chain_tip_height ?? 0,
    shieldedSpendableZat: shielded,
    transparentSpendableZat: b.transparent_spendable ?? 0,
    totalZat: b.total ?? 0,
  };
}

export function parseTxid(text: string): string {
  const ids = text.match(/\b[0-9a-f]{64}\b/g);
  if (!ids) throw new Error("send produced no transaction id");
  return ids[ids.length - 1]!;
}

/** The last JSON line in mixed log output. */
function lastJsonLine(text: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .reverse()
    .find((l) => l.startsWith("{") || l.startsWith("["));
  if (!line) throw new Error("expected JSON output");
  return line;
}

export interface DevtoolOptions {
  bin: string;
  walletDir: string;
  identity: string;
  server?: string;
  /** "tor" hides the subscriber's IP from the light-wallet server. */
  connection?: "direct" | "tor";
}

export class DevtoolWallet implements WalletAdapter {
  private readonly o: Required<DevtoolOptions>;

  constructor(opts: DevtoolOptions) {
    this.o = { ...opts, server: opts.server ?? "zecrocks", connection: opts.connection ?? "direct" };
  }

  private async exec(args: string[], timeoutMs = 600_000): Promise<string> {
    const { stdout, stderr } = await run(this.o.bin, args, {
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return `${stdout}\n${stderr}`;
  }

  private net(): string[] {
    return ["-s", this.o.server, "--connection", this.o.connection];
  }

  async inspectAddress(address: string): Promise<AddressInfo> {
    return parseInspect(await this.exec(["inspect", address], 30_000));
  }

  async sync(): Promise<void> {
    await this.exec(["wallet", "-w", this.o.walletDir, "sync", ...this.net()]);
  }

  async balance(): Promise<Balance> {
    return parseBalance(lastJsonLine(await this.exec(["wallet", "-w", this.o.walletDir, "balance", "--json"], 60_000)));
  }

  async newAddress(): Promise<string> {
    const out = await this.exec(["wallet", "-w", this.o.walletDir, "generate-address"], 60_000);
    const addr = /Address:\s*(\S+)/.exec(out)?.[1];
    if (!addr) throw new Error("generate-address printed no address");
    return addr;
  }

  /** Checks that cannot move funds. Runs before the agent records a send as pending. */
  async preflight(address: string, amountZat: number): Promise<void> {
    const info = await this.inspectAddress(address);
    if (info.receivers.includes("transparent") || !info.receivers.some((r) => r !== "transparent")) {
      throw new Error("refusing: recipient is not a shielded-only address");
    }
    await this.sync();
    const bal = await this.balance();
    // The wallet only spends shielded notes in a transfer; transparent funds would have to be
    // shielded first, which links the transparent address. Never do that silently.
    if (bal.shieldedSpendableZat < amountZat + MIN_FEE_ZAT) {
      throw new Error(
        `refusing: shielded spendable ${bal.shieldedSpendableZat} zat is below ${amountZat + MIN_FEE_ZAT} zat` +
          (bal.transparentSpendableZat > 0 ? "; transparent funds are not used automatically" : ""),
      );
    }
  }

  async sendShielded(address: string, amountZat: number, memo: string): Promise<{ txid: string }> {
    const info = await this.inspectAddress(address);
    if (info.receivers.includes("transparent") || !info.receivers.some((r) => r !== "transparent")) {
      throw new Error("refusing: recipient is not a shielded-only address");
    }
    const out = await this.exec([
      "wallet",
      "-w",
      this.o.walletDir,
      "send",
      "-i",
      this.o.identity,
      "--address",
      address,
      "--value",
      String(amountZat),
      "--memo",
      memo,
      ...this.net(),
    ]);
    return { txid: parseTxid(out) };
  }
}
