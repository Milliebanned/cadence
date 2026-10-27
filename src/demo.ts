#!/usr/bin/env node
/** One command to see Cadence work end to end on a private Zcash chain:
 *  starts Zebra (regtest) and Zaino, creates the wallets, mines shielded test coins to the
 *  subscriber, runs the merchant and the subscriber app, mines a block every 15 seconds,
 *  and serves a hub page that explains the demo and links every part.
 *
 *    npm run demo            (first run takes a minute or two; later runs reuse the chain)
 *    npm run demo -- --reset (start over from an empty chain)
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hubHtml, HUB_JS } from "./hub.ts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = process.env.CADENCE_VENDOR ?? resolve(REPO, "..", "vendor");
const DATA = process.env.CADENCE_DEMO_DIR ?? join(homedir(), ".cadence-demo");
const BIN = {
  zebrad: join(VENDOR, "zebra/target/release/zebrad"),
  zainod: join(VENDOR, "zaino/target/release/zainod"),
  devtool: join(VENDOR, "zcash-devtool/target/release/zcash-devtool"),
};
const PORTS = { zebraRpc: 18232, zebraP2p: 18344, zaino: 8137, merchant: 8780, app: 8790, hub: 8770 };
const LWD = `127.0.0.1:${PORTS.zaino}`;
// On a server behind a reverse proxy: the hub at https://<domain>, the merchant at
// https://shop.<domain>, the subscriber app at https://app.<domain>. Unset: everything on localhost.
// Hosts that publish each port on its own address (like Instabox) set the three URLs directly.
const DOMAIN = process.env.CADENCE_PUBLIC_DOMAIN?.trim() || "";
// Each may be a comma-separated list (e.g. a custom domain, then the host's own URL): the first is
// used in links, and every one is accepted.
const envList = (k: string) => (process.env[k] ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
const ALIASES = {
  hub: envList("CADENCE_PUBLIC_HUB").length ? envList("CADENCE_PUBLIC_HUB") : [DOMAIN ? `https://${DOMAIN}` : `http://127.0.0.1:${PORTS.hub}`],
  shop: envList("CADENCE_PUBLIC_SHOP").length ? envList("CADENCE_PUBLIC_SHOP") : [DOMAIN ? `https://shop.${DOMAIN}` : `http://127.0.0.1:${PORTS.merchant}`],
  app: envList("CADENCE_PUBLIC_APP").length ? envList("CADENCE_PUBLIC_APP") : [DOMAIN ? `https://app.${DOMAIN}` : `http://127.0.0.1:${PORTS.app}`],
};
const PUBLIC = { hub: ALIASES.hub[0]!, shop: ALIASES.shop[0]!, app: ALIASES.app[0]! };
const IS_PUBLIC = !PUBLIC.hub.startsWith("http://127.0.0.1");
const RPC = `http://127.0.0.1:${PORTS.zebraRpc}`;
// Transparent address of the public BIP-39 test phrase "abandon … art". It only receives the
// first few bootstrap blocks, before any demo wallet exists. Nobody's funds are involved.
const BOOTSTRAP_MINER = "tmBsTi2xWTjUdEXnuTceL7fecEQKeWaPDJd";

const children: ChildProcess[] = [];
const log = (msg: string) => console.log(`\x1b[2m[demo]\x1b[0m ${msg}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(what: string, fn: () => Promise<T | undefined>, timeoutMs = 120_000): Promise<T> {
  const until = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < until) {
    try {
      const v = await fn();
      if (v !== undefined) return v;
    } catch (e) {
      lastErr = e;
    }
    await sleep(1000);
  }
  throw new Error(`timed out waiting for ${what}${lastErr ? `: ${(lastErr as Error).message}` : ""}`);
}

async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(300_000),
  });
  const body = (await r.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result as T;
}

function start(name: string, cmd: string, args: string[], opts: { onLine?: (line: string) => void } = {}): ChildProcess {
  const out = openSync(join(DATA, `${name}.log`), "a");
  const child = spawn(cmd, args, { stdio: ["ignore", opts.onLine ? "pipe" : out, out], env: { ...process.env, NO_COLOR: "1" } });
  if (opts.onLine && child.stdout) {
    let buf = "";
    child.stdout.on("data", (d: Buffer) => {
      writeFileSync(join(DATA, `${name}.log`), d, { flag: "a" });
      buf += d.toString();
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        opts.onLine!(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    });
  }
  child.on("exit", (code) => {
    if (!shuttingDown && !stopping.has(child)) log(`${name} exited (code ${code}); see ${join(DATA, `${name}.log`)}`);
  });
  children.push(child);
  return child;
}

const stopping = new Set<ChildProcess>();
async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  stopping.add(child);
  child.kill("SIGTERM");
  await Promise.race([new Promise((r) => child.once("exit", r)), sleep(10_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

/** Runs zcash-devtool with stdin closed: some commands wait for input when stdin is an open pipe. */
function devtool(args: string[], timeoutMs = 300_000): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(BIN.devtool, args, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NO_COLOR: "1" } });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (out += d.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise(out);
      else reject(new Error(`zcash-devtool ${args.slice(0, 4).join(" ")} failed (${code}): ${out.trim().split("\n").slice(-2).join(" ")}`));
    });
  });
}

function zebraConfig(minerAddress: string): string {
  return `# Private regtest chain for the Cadence demo. Upgrades match mainnet today: through NU6.3, no NU7.
[consensus]
checkpoint_sync = false

[mining]
internal_miner = false
miner_address = "${minerAddress}"

[network]
network = "Regtest"
listen_addr = "127.0.0.1:${PORTS.zebraP2p}"
cache_dir = false

[network.testnet_parameters.activation_heights]
Overwinter = 1
Sapling = 1
Blossom = 1
Heartwood = 1
Canopy = 1
NU5 = 2
NU6 = 2
"NU6.1" = 2
"NU6.2" = 2
"NU6.3" = 2

[rpc]
listen_addr = "127.0.0.1:${PORTS.zebraRpc}"
enable_cookie_auth = false

[state]
cache_dir = "${join(DATA, "zebra-state")}"

[tracing]
use_color = false
`;
}

const ACTIVATION_HEIGHTS = `overwinter = 1
sapling = 1
blossom = 1
heartwood = 1
canopy = 1
nu5 = 2
nu6 = 2
nu6_1 = 2
nu6_2 = 2
nu6_3 = 2
nu7 = "never"
`;

const ZAINO_CONFIG = `backend = "rpc"
network = "Regtest"
ephemeral_finalised_state = false
zebra_db_path = "${join(DATA, "zebra-state")}"

[grpc_settings]
listen_address = "127.0.0.1:${PORTS.zaino}"

[validator_settings]
validator_jsonrpc_listen_address = "127.0.0.1:${PORTS.zebraRpc}"
validator_user = "local"
validator_password = "local"

[storage.database]
path = "${join(DATA, "zaino-db")}"
`;

async function startChain(): Promise<{ zebra: ChildProcess; zaino: ChildProcess }> {
  const zebra = start("zebrad", BIN.zebrad, ["-c", join(DATA, "zebrad.toml"), "start"]);
  await waitFor("Zebra RPC", async () => ((await rpc<number>("getblockcount")) >= 0 ? true : undefined));
  const zaino = start("zainod", BIN.zainod, ["start", "-c", join(DATA, "zainod.toml")]);
  await sleep(4000);
  return { zebra, zaino };
}

async function bootstrap(): Promise<void> {
  log("first run: creating a private Zcash chain and wallets (about a minute)");
  mkdirSync(join(DATA, "wallets"), { recursive: true });
  writeFileSync(join(DATA, "activation-heights.toml"), ACTIVATION_HEIGHTS);
  writeFileSync(join(DATA, "zainod.toml"), ZAINO_CONFIG);
  writeFileSync(join(DATA, "zebrad.toml"), zebraConfig(BOOTSTRAP_MINER));

  let { zebra, zaino } = await startChain();
  await rpc("generate", [5]);

  const w = (n: string) => join(DATA, "wallets", n);
  for (const n of ["subscriber", "merchant"]) {
    await waitFor(`${n} wallet`, async () => {
      await devtool(["wallet", "-w", w(n), "init", "--name", n, "-i", `${w(n)}.age.txt`, "-n", "regtest", "--activation-heights", join(DATA, "activation-heights.toml"), "--birthday", "1", "-s", LWD]);
      return true;
    }, 60_000);
    await devtool(["wallet", "-w", w(n), "sync", "-s", LWD]);
  }
  const subscriberAddr = /Address:\s*(\S+)/.exec(await devtool(["wallet", "-w", w("subscriber"), "generate-address"]))?.[1];
  const ufvk = /UFVK:\s*(\S+)/.exec(await devtool(["wallet", "-w", w("merchant"), "list-accounts"]))?.[1];
  if (!subscriberAddr || !ufvk) throw new Error("could not read wallet keys");
  // The merchant server only ever gets this view-only wallet: a viewing key, no seed.
  await devtool(["wallet", "-w", w("merchant-view"), "init-fvk", "--name", "merchant-view", "--fvk", ufvk, "--birthday", "1", "-s", LWD]);

  log("mining shielded coins straight to the subscriber (no transparent step)");
  await stop(zaino);
  await stop(zebra);
  writeFileSync(join(DATA, "zebrad.toml"), zebraConfig(subscriberAddr));
  ({ zebra, zaino } = await startChain());
  await rpc("generate", [110]); // coinbase matures after 100 blocks

  mkdirSync(join(DATA, "merchant"), { recursive: true });
  mkdirSync(join(DATA, "agent"), { recursive: true });
  writeFileSync(
    join(DATA, "merchant", "merchant.json"),
    JSON.stringify(
      {
        network: "regtest",
        name: "Demo VPN",
        dataDir: join(DATA, "merchant"),
        port: PORTS.merchant,
        syncEverySec: 10,
        cadenceAppUrl: `http://127.0.0.1:${PORTS.app}`,
        wallet: { devtool: BIN.devtool, walletDir: w("merchant-view"), server: LWD },
        plans: [
          {
            id: "vpn",
            name: "Private VPN",
            description: "A no-logs VPN you can pay for without linking your identity to your payments.",
            features: ["Unlimited devices", "No account, no email", "Servers in 40 countries"],
            amountZat: 25_000_000,
            periodSec: 120,
            maxCycles: 12,
            graceSec: 100,
          },
          {
            id: "newsletter",
            name: "Research Newsletter",
            description: "Weekly independent research on privacy technology.",
            features: ["Full archive access", "Weekly long-form issue"],
            amountZat: 5_000_000,
            periodSec: 300,
            maxCycles: 24,
            graceSec: 240,
          },
        ],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(DATA, "agent", "agent.json"),
    JSON.stringify(
      {
        network: "regtest",
        dataDir: join(DATA, "agent"),
        appPort: PORTS.app,
        wallet: { devtool: BIN.devtool, walletDir: w("subscriber"), identity: `${w("subscriber")}.age.txt`, server: LWD },
      },
      null,
      2,
    ),
  );
  writeFileSync(join(DATA, "bootstrapped"), new Date().toISOString());
  await stop(zaino);
  await stop(zebra);
  children.length = 0;
}

async function miningNeeded(): Promise<boolean> {
  const mempool = await rpc<string[]>("getrawmempool").catch(() => []);
  if (mempool.length > 0) return true;
  const statePath = join(DATA, "agent", "agent-state.json");
  if (!existsSync(statePath)) return false;
  const now = Math.floor(Date.now() / 1000);
  const { mandates } = JSON.parse(readFileSync(statePath, "utf8")) as {
    mandates: Record<string, { mandate: { maxCycles: number; startAt: number; periodSec: number; expiresAt: number }; state: { revoked: boolean; cyclesPaid: number; pending: unknown; unconfirmed?: unknown } }>;
  };
  return Object.values(mandates).some(({ mandate: m, state: s }) => {
    if (s.pending || s.unconfirmed) return true; // a payment is waiting for blocks
    if (s.revoked || s.cyclesPaid >= m.maxCycles || now >= m.expiresAt) return false;
    const nextDue = m.startAt + s.cyclesPaid * m.periodSec;
    return nextDue - now < 180; // a renewal is due within three minutes
  });
}

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log("stopping…");
  await Promise.all([...children].reverse().map(stop));
  process.exit(0);
}

async function main(): Promise<void> {
  const missing = Object.entries(BIN).filter(([, p]) => !existsSync(p));
  if (missing.length) {
    console.error(`Missing ${missing.map(([n]) => n).join(", ")} under ${VENDOR}. Build them once with:\n  sh scripts/build-local-chain.sh`);
    process.exit(1);
  }
  if (process.argv.includes("--reset")) rmSync(DATA, { recursive: true, force: true });
  mkdirSync(DATA, { recursive: true });
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  if (!existsSync(join(DATA, "bootstrapped"))) await bootstrap();

  // Point the merchant and the app at their public addresses (on every start, so a domain can be added later).
  const merchantCfgPath = join(DATA, "merchant", "merchant.json");
  const merchantCfg = JSON.parse(readFileSync(merchantCfgPath, "utf8"));
  merchantCfg.publicUrl = PUBLIC.shop;
  merchantCfg.cadenceAppUrl = PUBLIC.app;
  writeFileSync(merchantCfgPath, JSON.stringify(merchantCfg, null, 2));
  const agentCfgPath = join(DATA, "agent", "agent.json");
  const agentCfg = JSON.parse(readFileSync(agentCfgPath, "utf8"));
  if (IS_PUBLIC) {
    agentCfg.publicUrl = PUBLIC.app;
    agentCfg.publicAliases = ALIASES.app.slice(1);
  } else {
    delete agentCfg.publicUrl;
    delete agentCfg.publicAliases;
  }
  writeFileSync(agentCfgPath, JSON.stringify(agentCfg, null, 2));

  await startChain();
  const links: { admin?: string; app?: string } = {};
  start("merchant", process.execPath, [join(REPO, "src/cli.ts"), "merchant", "serve", "--config", join(DATA, "merchant", "merchant.json")], {
    onLine: (l) => {
      const m = /(http:\/\/127\.0\.0\.1:\d+\/admin#t=\S+)/.exec(l);
      if (m) links.admin = m[1];
    },
  });
  const lockPath = join(DATA, "agent", "agent.lock");
  if (existsSync(lockPath)) rmSync(lockPath); // the demo owns this agent; a previous run may have been killed
  start("app", process.execPath, [join(REPO, "src/cli.ts"), "agent", "app", "--config", join(DATA, "agent", "agent.json"), "--jitter-min", "0", "--every-sec", "10"], {
    onLine: (l) => {
      const m = /(http:\/\/127\.0\.0\.1:\d+\/#t=\S+)/.exec(l);
      if (m) links.app = m[1];
    },
  });
  await waitFor("merchant and app", async () => (links.admin && links.app ? true : undefined), 60_000);

  // Mine only while there is something to confirm or a payment is about to fall due, so an
  // unused demo goes fully idle (hosts that pause idle machines can then pause it).
  setInterval(() => void (async () => {
    if (await miningNeeded()) await rpc("generate", [1]);
  })().catch(() => {}), 15_000);

  const hub = createServer(async (req, res) => {
    const headers = {
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    };
    const okHosts = [`127.0.0.1:${PORTS.hub}`, `localhost:${PORTS.hub}`, ...ALIASES.hub.map((u) => new URL(u).host)];
    if (!okHosts.includes(String(req.headers.host))) {
      res.writeHead(421, headers);
      return res.end();
    }
    if (req.url === "/hub.js") {
      res.writeHead(200, { ...headers, "content-type": "text/javascript; charset=utf-8" });
      return res.end(HUB_JS);
    }
    if (req.url === "/status") {
      let height: number | null = null;
      try {
        height = await rpc<number>("getblockcount");
      } catch {}
      res.writeHead(200, { ...headers, "content-type": "application/json" });
      return res.end(JSON.stringify({ height }));
    }
    res.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" });
    res.end(
      hubHtml({
        appUrl: links.app!.replace(`http://127.0.0.1:${PORTS.app}`, PUBLIC.app),
        adminUrl: links.admin!.replace(`http://127.0.0.1:${PORTS.merchant}`, PUBLIC.shop),
        checkoutUrls: [
          { name: "Private VPN", url: `${PUBLIC.shop}/checkout/vpn` },
          { name: "Research Newsletter", url: `${PUBLIC.shop}/checkout/newsletter` },
        ],
        proofCommand: `node src/cli.ts agent proof --config ${join(DATA, "agent", "agent.json")} --rpc ${RPC}`,
      }),
    );
  });
  hub.listen(PORTS.hub, "127.0.0.1", () => {
    console.log(`\n  Cadence demo is running. Open:\n\n    \x1b[1m${PUBLIC.hub}\x1b[0m\n\n  Ctrl+C stops everything. Logs: ${DATA}\n`);
    if (process.argv.includes("--open")) execFile("open", [`http://127.0.0.1:${PORTS.hub}`], () => {});
  });
}

main().catch(async (e) => {
  console.error(`demo failed: ${(e as Error).message}`);
  await shutdown();
});
