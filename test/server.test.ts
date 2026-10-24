import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { createMandate } from "../src/mandate.ts";
import { Merchant } from "../src/merchant.ts";
import { merchantServer } from "../src/server.ts";
import { verifyInvoice } from "../src/invoice.ts";
import type { Invoice } from "../src/types.ts";
import { DAY, T0, merchant as keys } from "./helpers.ts";

async function withServer(fn: (base: string, m: Merchant) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "cadence-s-"));
  let n = 0;
  const m = new Merchant({
    network: "test",
    keys,
    plans: [{ id: "pro", name: "Pro", amountZat: 5_000_000, periodSec: 30 * DAY, maxCycles: 12, graceSec: 3 * DAY }],
    storePath: join(dir, "m.json"),
    newAddress: async () => `utest1srv${++n}`.padEnd(48, "x"),
  });
  const srv = merchantServer(m, { adminToken: "admin-token-123", now: () => T0 + 60 });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  try {
    await fn(base, m);
  } finally {
    srv.close();
  }
}

test("offer, subscribe and fetch a signed invoice over HTTP", async () => {
  await withServer(async (base) => {
    const offer = await (await fetch(`${base}/offer/pro`)).json();
    const mandate = createMandate({
      network: offer.network,
      payee: { mode: "merchant", merchantKey: offer.merchantKey },
      planId: "pro",
      amountZat: offer.plan.amountZat,
      periodSec: offer.plan.periodSec,
      maxCycles: 3,
      startAt: T0,
      expiresAt: T0 + 100 * DAY,
      graceSec: offer.plan.graceSec,
      jitterSec: 600,
    });
    const reg = await fetch(`${base}/subscriptions`, { method: "POST", body: JSON.stringify(mandate) });
    assert.equal(reg.status, 201);
    const inv = (await (await fetch(`${base}/invoices/${mandate.id}/1`)).json()) as Invoice;
    assert.ok(verifyInvoice(inv, offer.merchantKey));
    const bad = await fetch(`${base}/subscriptions`, { method: "POST", body: JSON.stringify({ ...mandate, amountZat: 1 }) });
    assert.equal(bad.status, 422);
  });
});

test("the dashboard and cancel need the admin token", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/`)).status, 401);
    const ok = await fetch(`${base}/`, { headers: { authorization: "Bearer admin-token-123" } });
    assert.equal(ok.status, 200);
    assert.match(await ok.text(), /This server cannot spend/);
    assert.equal((await fetch(`${base}/subscriptions/x/cancel`, { method: "POST" })).status, 404);
  });
});
