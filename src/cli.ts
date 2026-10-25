#!/usr/bin/env node
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Agent } from "./agent.ts";
import { AuditLog } from "./audit.ts";
import { DevtoolWallet } from "./devtool.ts";
import { generateMerchantKeys, type MerchantKeys } from "./invoice.ts";
import { Merchant, signWebhook, type Plan } from "./merchant.ts";
import { subscriberApp, newAppToken } from "./app.ts";
import { acquireLock } from "./lock.ts";
import {
  DAY,
  MetaStore,
  describeLimits,
  directMandate,
  duration,
  fetchOffer,
  mandateFromOffer,
  registerWithMerchant,
  zecToZat,
} from "./subscribe.ts";
import { readReceived } from "./scan.ts";
import { buildReport, fetchTxRpc, renderMarkdown, type Payment, type TxView } from "./proof.ts";
import { merchantServer } from "./server.ts";
import { EventLog } from "./events.ts";
import type { Invoice, Mandate, Network } from "./types.ts";

const now = () => Math.floor(Date.now() / 1000);

interface WalletConfig {
  devtool: string;
  walletDir: string;
  identity?: string;
  server?: string;
  connection?: "direct" | "tor";
}

interface AgentConfig {
  /** network of the subscriber wallet; required by the app */
  network?: Network;
  dataDir: string;
  wallet: WalletConfig;
  appPort?: number;
}

interface MerchantConfig {
  network: Network;
  dataDir: string;
  port: number;
  /** a view-only wallet, created with `zcash-devtool wallet init-fvk` */
  wallet: WalletConfig;
  plans: Plan[];
  /** shown on checkout pages */
  name?: string;
  /** public base URL of this merchant server (default http://127.0.0.1:<port>) */
  publicUrl?: string;
  /** where customers' Cadence apps listen (default http://127.0.0.1:8790) */
  cadenceAppUrl?: string;
  webhookUrl?: string;
  syncEverySec?: number;
  /** Fetch full transactions to read memos. Off by default: payments match by address alone,
   *  and fetching by txid reveals interest in those transactions to the light-wallet server. */
  fetchMemos?: boolean;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeSecret(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
}

function usage(): never {
  console.log(`cadence: private autopay subscriptions for shielded Zcash

  cadence agent subscribe --config agent.json --offer <merchant-url>/offer/<plan> [--cycles N] [--jitter-min M]
  cadence agent subscribe --config agent.json --address <shielded address> --amount <ZEC> --every-days D --cycles N [--network test|main|regtest]
  cadence agent app       --config agent.json [--port P]     local app: subscriptions, approvals, revoke
  cadence agent run       --config agent.json [--once] [--every-sec S]
  cadence agent status    --config agent.json
  cadence agent revoke    --config agent.json --mandate <id>
  cadence agent resolve   --config agent.json --mandate <id> --outcome paid|not-paid
  cadence agent log       --config agent.json [--verify]

  cadence agent proof     --config agent.json --rpc <node JSON-RPC url> [--control <leaky txid>] [--out report.md]

  cadence merchant serve  --config merchant.json`);
  process.exit(1);
}

// ---------- agent ----------

function agentParts(configPath: string) {
  const cfg = loadJson<AgentConfig>(configPath);
  const dataDir = resolve(cfg.dataDir);
  const meta = new MetaStore(join(dataDir, "subscriptions.json"), join(dataDir, "merchants.json"));
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
      const base = meta.get(mandate.id)?.merchantUrl;
      if (!base) throw new Error("no merchant URL recorded for this mandate");
      const r = await fetch(`${base}/invoices/${mandate.id}/${cycle}`, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) {
        const detail = ((await r.json().catch(() => ({}))) as { error?: string }).error;
        throw new Error(`merchant returned ${r.status}${detail ? `: ${detail}` : ""}`);
      }
      return (await r.json()) as Invoice;
    },
  });
  return { cfg, dataDir, meta, agent, wallet };
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
      rpc: { type: "string" },
      control: { type: "string" },
      out: { type: "string" },
      port: { type: "string" },
      label: { type: "string" },
    },
  });
  if (!values.config) usage();
  const { cfg, dataDir, meta, agent, wallet } = agentParts(values.config);

  if (sub === "subscribe") {
    const start = now();
    const jitterSec = Number(values["jitter-min"]) * 60;
    let mandate: Mandate;
    let label: string;
    let merchantUrl: string | undefined;
    if (values.offer) {
      const { offer, base, ref } = await fetchOffer(values.offer);
      mandate = mandateFromOffer(offer, { cycles: values.cycles ? Number(values.cycles) : undefined, jitterSec, now: start });
      await registerWithMerchant(base, mandate, ref);
      label = offer.plan.name;
      merchantUrl = base;
    } else if (values.address && values.amount && values["every-days"] && values.cycles) {
      const periodSec = Math.round(Number(values["every-days"]) * DAY);
      mandate = directMandate({
        network: values.network === "main" ? "main" : values.network === "regtest" ? "regtest" : "test",
        address: values.address,
        amountZat: zecToZat(values.amount),
        periodSec,
        cycles: Number(values.cycles),
        graceSec: Math.round(Number(values["grace-days"]) * DAY),
        jitterSec,
        now: start,
      });
      label = values.label ?? "Autopay";
    } else {
      usage();
    }
    agent.subscribe(mandate, start);
    meta.set(mandate.id, { label, merchantUrl, createdAt: start });
    for (const line of describeLimits(mandate, label)) console.log(line);
    console.log(`Mandate ${mandate.id}`);
    return;
  }

  if (sub === "app") {
    if (!cfg.network) throw new Error('set "network" in the agent config to use the app');
    acquireLock(join(dataDir, "agent.lock"));
    const port = Number(values.port ?? cfg.appPort ?? 8790);
    const token = newAppToken();
    const { server } = subscriberApp({
      agent,
      meta,
      auditPath: join(dataDir, "audit.log"),
      network: cfg.network,
      port,
      token,
      balance: async () => {
        await wallet.sync();
        return wallet.balance();
      },
      tickEverySec: Number(values["every-sec"]),
      jitterSec: Number(values["jitter-min"]) * 60,
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`Cadence is running. Open this link (it carries this session's key, keep it private):`);
      console.log(`  http://127.0.0.1:${port}/#t=${token}`);
    });
    return;
  }

  if (sub === "run") {
    acquireLock(join(dataDir, "agent.lock"));
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
  if (sub === "proof") {
    if (!values.rpc) usage();
    const items: Array<{ payment: Payment; tx: TxView }> = [];
    let network = "";
    const entries = AuditLog.read(join(dataDir, "audit.log"));
    // A payment that expired unmined never happened on chain; its cycle was paid again later.
    const dropped = new Set(entries.filter((e) => e.event === "expired-unmined").map((e) => String((e.detail as { txid: string }).txid)));
    for (const e of entries) {
      if (e.event !== "paid" || dropped.has(String((e.detail as { txid: string }).txid))) continue;
      const { mandateId, cycle, txid } = e.detail as { mandateId: string; cycle: number; txid: string };
      const mandate = agent.mandate(mandateId);
      network = mandate.network;
      const payment: Payment = {
        mandateId,
        cycle,
        txid,
        amountZat: mandate.amountZat,
        address: agent.stateOf(mandateId).usedAddresses[cycle - 1] ?? null,
        payeeMode: mandate.payee.mode,
      };
      items.push({ payment, tx: await fetchTxRpc(values.rpc, txid) });
    }
    if (items.length === 0) throw new Error("the audit log has no payments yet");
    let control: { payment: Payment; tx: TxView } | undefined;
    if (values.control) {
      const tx = await fetchTxRpc(values.rpc, values.control);
      control = { payment: { mandateId: "control", cycle: 0, txid: values.control, amountZat: 1, address: null, payeeMode: "address" }, tx };
    }
    const report = buildReport(network, items, control);
    const md = renderMarkdown(report);
    if (values.out) writeFileSync(values.out, md);
    console.log(md);
    process.exitCode = report.pass ? 0 : 2;
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

  const events = new EventLog();
  const merchant = new Merchant({
    network: cfg.network,
    keys,
    plans: cfg.plans,
    storePath: join(dataDir, "merchant-state.json"),
    newAddress: () => wallet.newAddress(),
    onEvent: (e) => {
      console.log(`${new Date(e.at * 1000).toISOString()} ${e.type} ${e.mandateId.slice(0, 12)}${e.cycle ? ` cycle ${e.cycle}` : ""}`);
      const logged = events.push(e);
      if (!cfg.webhookUrl) return;
      const { body, signature } = signWebhook(e, secrets.webhookSecret);
      fetch(cfg.webhookUrl, {
        method: "POST",
        body,
        headers: { "content-type": "application/json", "cadence-signature": signature },
        signal: AbortSignal.timeout(15_000),
      })
        .then((r) => {
          logged.webhook = { status: r.ok ? "sent" : "failed", code: r.status };
        })
        .catch((err) => {
          logged.webhook = { status: "failed", error: (err as Error).message };
          console.error(`webhook failed: ${(err as Error).message}`);
        });
    },
  });

  const health = { lastSyncAt: null as number | null, lastSyncError: null as string | null };
  const reconcile = async () => {
    try {
      await wallet.sync();
      if (cfg.fetchMemos) await wallet.enhance();
      merchant.reconcile(readReceived(join(cfg.wallet.walletDir, "data.sqlite")), now());
      health.lastSyncAt = now();
      health.lastSyncError = null;
    } catch (e) {
      health.lastSyncError = (e as Error).message.split("\n")[0]!;
      console.error(`sync failed: ${health.lastSyncError}`);
    }
  };
  setInterval(() => void reconcile(), (cfg.syncEverySec ?? 60) * 1000);
  void reconcile();

  merchantServer(merchant, {
    adminToken: secrets.adminToken,
    publicUrl: cfg.publicUrl,
    appUrl: cfg.cadenceAppUrl,
    merchantName: cfg.name,
    events,
    webhookConfigured: Boolean(cfg.webhookUrl),
    health: () => ({ ...health }),
  }).listen(cfg.port, "127.0.0.1", () => {
    console.log(`Cadence merchant on http://127.0.0.1:${cfg.port}  (network ${cfg.network})`);
    console.log(`Checkout: ${cfg.plans.map((p) => `http://127.0.0.1:${cfg.port}/checkout/${p.id}`).join("  ")}`);
    console.log(`Dashboard (keep this link private): http://127.0.0.1:${cfg.port}/admin#t=${secrets.adminToken}`);
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
