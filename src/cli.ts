#!/usr/bin/env node
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Agent } from "./agent.ts";
import { AuditLog } from "./audit.ts";
import { DevtoolWallet } from "./devtool.ts";
import { generateMerchantKeys, type MerchantKeys } from "./invoice.ts";
import { createMandate } from "./mandate.ts";
import { Merchant, signWebhook, type Plan } from "./merchant.ts";
import { readReceived } from "./scan.ts";
import { merchantServer } from "./server.ts";
import type { Invoice, Mandate, Network } from "./types.ts";

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86_400;

interface WalletConfig {
  devtool: string;
  walletDir: string;
  identity?: string;
  server?: string;
  connection?: "direct" | "tor";
}

interface AgentConfig {
  dataDir: string;
  wallet: WalletConfig;
}

interface MerchantConfig {
  network: Network;
  dataDir: string;
  port: number;
  /** a view-only wallet, created with `zcash-devtool wallet init-fvk` */
  wallet: WalletConfig;
  plans: Plan[];
  webhookUrl?: string;
  syncEverySec?: number;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeSecret(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
}

function zecToZat(s: string): number {
  if (!/^\d+(\.\d{1,8})?$/.test(s)) throw new Error(`invalid ZEC amount: ${s}`);
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 1e8 + Number(frac.padEnd(8, "0"));
}

function usage(): never {
  console.log(`cadence: private autopay subscriptions for shielded Zcash

  cadence agent subscribe --config agent.json --offer <merchant-url>/offer/<plan> [--cycles N] [--jitter-min M]
  cadence agent subscribe --config agent.json --address <shielded address> --amount <ZEC> --every-days D --cycles N [--network test|main]
  cadence agent run       --config agent.json [--once] [--every-sec S]
  cadence agent status    --config agent.json
  cadence agent revoke    --config agent.json --mandate <id>
  cadence agent resolve   --config agent.json --mandate <id> --outcome paid|not-paid
  cadence agent log       --config agent.json [--verify]

  cadence merchant serve  --config merchant.json`);
  process.exit(1);
}

// ---------- agent ----------

function agentParts(configPath: string) {
  const cfg = loadJson<AgentConfig>(configPath);
  const dataDir = resolve(cfg.dataDir);
  const merchantsPath = join(dataDir, "merchants.json");
  const merchants: Record<string, string> = existsSync(merchantsPath) ? loadJson(merchantsPath) : {};
  const wallet = new DevtoolWallet({
    bin: cfg.wallet.devtool,
    walletDir: cfg.wallet.walletDir,
    identity: cfg.wallet.identity ?? "",
    server: cfg.wallet.server,
    connection: cfg.wallet.connection,
  });
  const agent = new Agent({
    storePath: join(dataDir, "agent-state.json"),
    auditPath: join(dataDir, "audit.log"),
    wallet,
    getInvoice: async (mandate: Mandate, cycle: number): Promise<Invoice> => {
      const base = merchants[mandate.id];
      if (!base) throw new Error("no merchant URL recorded for this mandate");
      const r = await fetch(`${base}/invoices/${mandate.id}/${cycle}`, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`merchant returned ${r.status}`);
      return (await r.json()) as Invoice;
    },
  });
  return { cfg, dataDir, merchants, merchantsPath, agent };
}

async function agentCmd(sub: string, args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      config: { type: "string" },
      offer: { type: "string" },
      address: { type: "string" },
      amount: { type: "string" },
      "every-days": { type: "string" },
      cycles: { type: "string" },
      network: { type: "string", default: "test" },
      "jitter-min": { type: "string", default: "60" },
      "grace-days": { type: "string", default: "3" },
      once: { type: "boolean", default: false },
      "every-sec": { type: "string", default: "60" },
      mandate: { type: "string" },
      outcome: { type: "string" },
      verify: { type: "boolean", default: false },
    },
  });
  if (!values.config) usage();
  const { dataDir, merchants, merchantsPath, agent } = agentParts(values.config);

  if (sub === "subscribe") {
    const start = now();
    const jitterSec = Number(values["jitter-min"]) * 60;
    let mandate: Mandate;
    if (values.offer) {
      const offerUrl = new URL(values.offer);
      const r = await fetch(offerUrl, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`offer returned ${r.status}`);
      const offer = (await r.json()) as { network: Network; merchantKey: string; plan: Plan };
      const cycles = Number(values.cycles ?? offer.plan.maxCycles);
      mandate = createMandate({
        network: offer.network,
        payee: { mode: "merchant", merchantKey: offer.merchantKey },
        planId: offer.plan.id,
        amountZat: offer.plan.amountZat,
        periodSec: offer.plan.periodSec,
        maxCycles: Math.min(cycles, offer.plan.maxCycles),
        startAt: start,
        expiresAt: start + offer.plan.periodSec * cycles + offer.plan.graceSec + 1,
        graceSec: offer.plan.graceSec,
        jitterSec: Math.min(jitterSec, offer.plan.graceSec),
      });
      const base = offerUrl.origin + offerUrl.pathname.replace(/\/offer\/[^/]+$/, "");
      const reg = await fetch(`${base}/subscriptions`, {
        method: "POST",
        body: JSON.stringify(mandate),
        signal: AbortSignal.timeout(30_000),
      });
      if (reg.status !== 201) throw new Error(`merchant refused the mandate: ${await reg.text()}`);
      merchants[mandate.id] = base;
      writeFileSync(merchantsPath, JSON.stringify(merchants, null, 2));
      console.log(`Subscribed to "${offer.plan.name}": ${offer.plan.amountZat / 1e8} ZEC every ${offer.plan.periodSec / DAY} days, ${mandate.maxCycles} cycles at most.`);
    } else if (values.address && values.amount && values["every-days"] && values.cycles) {
      const periodSec = Math.round(Number(values["every-days"]) * DAY);
      const cycles = Number(values.cycles);
      const graceSec = Math.round(Number(values["grace-days"]) * DAY);
      mandate = createMandate({
        network: values.network === "main" ? "main" : "test",
        payee: { mode: "address", address: values.address },
        planId: "direct",
        amountZat: zecToZat(values.amount),
        periodSec,
        maxCycles: cycles,
        startAt: start,
        expiresAt: start + periodSec * cycles + graceSec + 1,
        graceSec,
        jitterSec: Math.min(jitterSec, graceSec, periodSec - 1),
      });
      console.log(`Autopay set: ${values.amount} ZEC every ${values["every-days"]} days, ${cycles} times, to one shielded address.`);
    } else {
      usage();
    }
    agent.subscribe(mandate, start);
    console.log(`Mandate ${mandate.id}`);
    console.log(`Limit: ${(mandate.amountZat * mandate.maxCycles) / 1e8} ZEC in total. Revoke any time with: cadence agent revoke --mandate ${mandate.id.slice(0, 12)}...`);
    return;
  }

  if (sub === "run") {
    const loop = async () => {
      for (const r of await agent.tick(now())) {
        const id = r.mandateId.slice(0, 12);
        if (r.action === "paid") console.log(`${new Date().toISOString()} paid    ${id} cycle ${r.cycle} tx ${r.txid}`);
        else if (r.action === "refused") console.log(`${new Date().toISOString()} REFUSED ${id} cycle ${r.cycle}: ${r.reasons.join("; ")}`);
        else if (r.action === "failed") console.log(`${new Date().toISOString()} failed  ${id} cycle ${r.cycle}: ${r.error}`);
        else if (r.action === "blocked") console.log(`${new Date().toISOString()} blocked ${id}: ${r.reason}`);
      }
    };
    await loop();
    if (values.once) return;
    const every = Math.max(10, Number(values["every-sec"])) * 1000;
    setInterval(() => void loop().catch((e) => console.error(e)), every);
    return;
  }

  const findId = (prefix?: string) => {
    if (!prefix) usage();
    const ids = agent.mandateIds().filter((id) => id.startsWith(prefix));
    if (ids.length !== 1) throw new Error(ids.length ? "mandate prefix is ambiguous" : "no such mandate");
    return ids[0]!;
  };

  if (sub === "status") {
    for (const id of agent.mandateIds()) {
      const s = agent.stateOf(id);
      console.log(
        `${id.slice(0, 12)}  paid ${s.cyclesPaid} cycles, ${s.totalPaidZat / 1e8} ZEC` +
          `${s.revoked ? "  REVOKED" : ""}${s.pending ? `  PENDING cycle ${s.pending.cycle}` : ""}`,
      );
    }
    return;
  }
  if (sub === "revoke") {
    const id = findId(values.mandate);
    agent.revoke(id, now());
    console.log(`Revoked ${id}. The agent will not pay this mandate again.`);
    return;
  }
  if (sub === "resolve") {
    const id = findId(values.mandate);
    if (values.outcome !== "paid" && values.outcome !== "not-paid") usage();
    agent.resolvePending(id, values.outcome, now());
    return;
  }
  if (sub === "log") {
    const path = join(dataDir, "audit.log");
    if (values.verify) {
      const v = AuditLog.verify(path);
      console.log(v.ok ? "audit log intact" : `audit log broken at entry ${v.atSeq}`);
      process.exitCode = v.ok ? 0 : 2;
      return;
    }
    for (const e of AuditLog.read(path)) console.log(`${e.seq}\t${new Date(e.at * 1000).toISOString()}\t${e.event}\t${JSON.stringify(e.detail)}`);
    return;
  }
  usage();
}

// ---------- merchant ----------

async function merchantCmd(sub: string, args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { config: { type: "string" } } });
  if (sub !== "serve" || !values.config) usage();
  const cfg = loadJson<MerchantConfig>(values.config);
  const dataDir = resolve(cfg.dataDir);

  const keysPath = join(dataDir, "merchant-keys.json");
  const secretsPath = join(dataDir, "secrets.json");
  if (!existsSync(keysPath)) writeSecret(keysPath, generateMerchantKeys());
  if (!existsSync(secretsPath)) writeSecret(secretsPath, { adminToken: randomBytes(24).toString("base64url"), webhookSecret: randomBytes(32).toString("hex") });
  const keys = loadJson<MerchantKeys>(keysPath);
  const secrets = loadJson<{ adminToken: string; webhookSecret: string }>(secretsPath);

  const wallet = new DevtoolWallet({
    bin: cfg.wallet.devtool,
    walletDir: cfg.wallet.walletDir,
    identity: "",
    server: cfg.wallet.server,
    connection: cfg.wallet.connection,
  });

  const merchant = new Merchant({
    network: cfg.network,
    keys,
    plans: cfg.plans,
    storePath: join(dataDir, "merchant.json"),
    newAddress: () => wallet.newAddress(),
    onEvent: (e) => {
      console.log(`${new Date(e.at * 1000).toISOString()} ${e.type} ${e.mandateId.slice(0, 12)}${e.cycle ? ` cycle ${e.cycle}` : ""}`);
      if (!cfg.webhookUrl) return;
      const { body, signature } = signWebhook(e, secrets.webhookSecret);
      fetch(cfg.webhookUrl, { method: "POST", body, headers: { "content-type": "application/json", "cadence-signature": signature } }).catch(
        (err) => console.error(`webhook failed: ${(err as Error).message}`),
      );
    },
  });

  const reconcile = async () => {
    await wallet.sync();
    merchant.reconcile(readReceived(join(cfg.wallet.walletDir, "data.sqlite")), now());
  };
  setInterval(() => void reconcile().catch((e) => console.error(`sync failed: ${(e as Error).message}`)), (cfg.syncEverySec ?? 60) * 1000);
  void reconcile().catch((e) => console.error(`sync failed: ${(e as Error).message}`));

  merchantServer(merchant, { adminToken: secrets.adminToken }).listen(cfg.port, "127.0.0.1", () => {
    console.log(`Cadence merchant on http://127.0.0.1:${cfg.port}  (network ${cfg.network})`);
    console.log(`Offers: ${cfg.plans.map((p) => `http://127.0.0.1:${cfg.port}/offer/${p.id}`).join("  ")}`);
    console.log(`Dashboard needs: Authorization: Bearer <adminToken from ${secretsPath}>`);
  });
}

const [role, sub, ...rest] = process.argv.slice(2);
try {
  if (role === "agent" && sub) await agentCmd(sub, rest);
  else if (role === "merchant" && sub) await merchantCmd(sub, rest);
  else usage();
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exit(1);
}
