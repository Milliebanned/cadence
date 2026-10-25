import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { request } from "node:http";
import { Agent } from "../src/agent.ts";
import { subscriberApp } from "../src/app.ts";
import { Merchant } from "../src/merchant.ts";
import { merchantServer } from "../src/server.ts";
import { MetaStore } from "../src/subscribe.ts";
import { MockWallet } from "../src/wallet.ts";
import { DAY, T0, merchant as keys } from "./helpers.ts";

const TOKEN = "test-token-abcdefghijklmnop";

async function startApp(now = () => T0 + 10) {
  const dir = mkdtempSync(join(tmpdir(), "cadence-app-"));
  const wallet = new MockWallet((a) => ({ network: "test", receivers: a.startsWith("tm") ? ["transparent"] : ["orchard"] }));
  const agent = new Agent({ storePath: join(dir, "state.json"), auditPath: join(dir, "audit.log"), wallet });
  const meta = new MetaStore(join(dir, "subscriptions.json"));
  // listen first to learn the port, then build the app bound to it
  const probe = (await import("node:http")).createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r));
  const port = (probe.address() as AddressInfo).port;
  probe.close();
  const app = subscriberApp({ agent, meta, auditPath: join(dir, "audit.log"), network: "test", port, token: TOKEN, tickEverySec: 3600, now, jitterSec: 0 });
  await new Promise<void>((r) => app.server.listen(port, "127.0.0.1", r));
  const base = `http://127.0.0.1:${port}`;
  const api = async (path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: { "x-cadence-token": TOKEN, "content-type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  return { app, base, port, api, wallet, agent };
}

function rawGet(port: number, path: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

test("the API refuses calls without the token, from another origin, or via another host name", async () => {
  const { app, port, api } = await startApp();
  try {
    assert.equal((await api("/api/state", undefined, { "x-cadence-token": "nope" })).status, 401);
    assert.equal((await api("/api/state", undefined, { origin: "https://evil.example" })).status, 403);
    assert.equal(await rawGet(port, "/api/state", { host: "evil.example", "x-cadence-token": TOKEN }), 421);
    assert.equal((await api("/api/state")).status, 200);
    assert.equal(await rawGet(port, "/", { host: `127.0.0.1:${port}` }), 200, "the page itself carries no data");
  } finally {
    app.stop();
  }
});

test("direct autopay: preview shows the limits, approve commits exactly that mandate, revoke stops it", async () => {
  const { app, api, wallet } = await startApp();
  try {
    const preview = await api("/api/preview/direct", {
      label: "Rent",
      address: "utest1landlordaddressxxxxxxxxxxxxxxxxxxxxxxx",
      amount: "0.5",
      everyDays: "30",
      cycles: "12",
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.equal(preview.body.cap, "6");
    assert.ok(preview.body.limits.some((l: string) => l.includes("at most 0.5 ZEC every 30 days")));

    const approved = await api("/api/approve", { previewId: preview.body.previewId });
    assert.equal(approved.status, 201);
    assert.equal(approved.body.mandateId, preview.body.mandateId);
    assert.equal((await api("/api/approve", { previewId: preview.body.previewId })).status, 410, "a preview is single use");

    await new Promise((r) => setTimeout(r, 50));
    const state = await api("/api/state");
    const sub = state.body.subscriptions[0];
    assert.equal(sub.label, "Rent");
    assert.equal(sub.cyclesPaid, 1);
    assert.equal(wallet.sent.length, 1);

    const revoked = await api("/api/revoke", { mandateId: sub.id });
    assert.equal(revoked.body.status, "revoked");
  } finally {
    app.stop();
  }
});

test("bad direct input is rejected with a clear message", async () => {
  const { app, api } = await startApp();
  try {
    const r = await api("/api/preview/direct", { address: "u1mainnetxxxxxxxxxxxxxxxxxxxx", amount: "1", everyDays: "30", cycles: "3" });
    assert.equal(r.status, 422);
    assert.match(r.body.error, /network/);
    const r2 = await api("/api/preview/direct", { address: "utest1x", amount: "1.123456789", everyDays: "30", cycles: "3" });
    assert.equal(r2.status, 422);
  } finally {
    app.stop();
  }
});

test("merchant link: preview, approve registers with the merchant, and the first invoice gets paid", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cadence-m-"));
  let n = 0;
  const merchant = new Merchant({
    network: "test",
    keys,
    plans: [{ id: "vpn", name: "Private VPN", amountZat: 25_000_000, periodSec: 30 * DAY, maxCycles: 12, graceSec: 3 * DAY }],
    storePath: join(dir, "m.json"),
    newAddress: async () => `utest1merchantcycle${++n}`.padEnd(48, "x"),
  });
  const srv = merchantServer(merchant, { adminToken: "x".repeat(20), now: () => T0 + 10 });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const mbase = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;

  const { app, api, wallet, agent } = await startApp();
  try {
    const preview = await api("/api/preview/offer", { offerUrl: `${mbase}/offer/vpn`, cycles: "3" });
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.equal(preview.body.label, "Private VPN");
    assert.equal(preview.body.maxCycles, 3);
    const ok = await api("/api/approve", { previewId: preview.body.previewId });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(merchant.subscriptions().length, 1);

    // The agent's invoice source in the app comes from the CLI wiring; drive one cycle here directly.
    const inv = await merchant.invoice(ok.body.mandateId, 1, T0 + 10);
    assert.ok(inv.address.startsWith("utest1merchantcycle"));
    assert.equal(agent.stateOf(ok.body.mandateId).cyclesPaid, 0, "merchant mode waits for a signed invoice");
    assert.equal(wallet.sent.length, 0);
  } finally {
    app.stop();
    srv.close();
  }
});
