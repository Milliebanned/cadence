import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { Merchant } from "../src/merchant.ts";
import { merchantServer } from "../src/server.ts";
import { fetchOffer, mandateFromOffer, registerWithMerchant } from "../src/subscribe.ts";
import { DAY, T0, merchant as keys } from "./helpers.ts";

async function start() {
  const dir = mkdtempSync(join(tmpdir(), "cadence-co-"));
  let n = 0;
  const merchant = new Merchant({
    network: "test",
    keys,
    plans: [{ id: "vpn", name: "Private <VPN>", amountZat: 25_000_000, periodSec: 30 * DAY, maxCycles: 12, graceSec: 3 * DAY }],
    storePath: join(dir, "m.json"),
    newAddress: async () => `utest1co${++n}`.padEnd(48, "x"),
  });
  const srv = merchantServer(merchant, { adminToken: "a".repeat(24), now: () => T0 + 10, merchantName: "Acme & Co", appUrl: "http://127.0.0.1:8790" });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  return { merchant, srv, base: `http://127.0.0.1:${(srv.address() as AddressInfo).port}` };
}

test("the checkout page shows the plan, escapes names, and links the customer's app with a one-time reference", async () => {
  const { srv, base } = await start();
  try {
    const r = await fetch(`${base}/checkout/vpn`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-security-policy") ?? "", /script-src 'self'/);
    const html = await r.text();
    assert.match(html, /Private &#60;VPN&#62;/);
    assert.match(html, /Acme &#38; Co/);
    assert.doesNotMatch(html, /Private <VPN>/);
    assert.match(html, /0\.25 ZEC/);
    const ref = /data-ref="([0-9a-f]{32})"/.exec(html)?.[1];
    assert.ok(ref);
    assert.match(html, new RegExp(`http://127\\.0\\.0\\.1:8790/\\?offer=${encodeURIComponent(`${base}/offer/vpn?ref=${ref}`).replace(/[.?]/g, "\\$&")}`));
    const other = /data-ref="([0-9a-f]{32})"/.exec(await (await fetch(`${base}/checkout/vpn`)).text())?.[1];
    assert.notEqual(ref, other, "each visit gets its own reference");
    assert.equal((await fetch(`${base}/checkout/nope`)).status, 404);
  } finally {
    srv.close();
  }
});

test("checkout status goes from waiting to subscribed to paid", async () => {
  const { merchant, srv, base } = await start();
  try {
    const html = await (await fetch(`${base}/checkout/vpn`)).text();
    const ref = /data-ref="([0-9a-f]{32})"/.exec(html)![1]!;
    const status = async () => (await fetch(`${base}/checkout/status?ref=${ref}`)).json();
    assert.deepEqual(await status(), { state: "waiting" });

    const { offer, base: mbase, ref: gotRef } = await fetchOffer(`${base}/offer/vpn?ref=${ref}`);
    assert.equal(gotRef, ref);
    const mandate = mandateFromOffer(offer, { cycles: 3, jitterSec: 0, now: T0 });
    await registerWithMerchant(mbase, mandate, gotRef);
    const s1 = await status();
    assert.equal(s1.state, "subscribed");
    assert.equal(s1.cyclesPaid, 0);

    const inv = await merchant.invoice(mandate.id, 1, T0 + 10);
    merchant.reconcile([{ txid: "a".repeat(64), minedHeight: 1, pool: "orchard", address: inv.address, valueZat: inv.amountZat, memo: null }], T0 + 20);
    assert.equal((await status()).cyclesPaid, 1);

    assert.equal((await fetch(`${base}/checkout/status?ref=../../etc`)).status, 400);
  } finally {
    srv.close();
  }
});

test("a malformed reference in an offer link is rejected before anything is registered", async () => {
  const { srv, base } = await start();
  try {
    await assert.rejects(fetchOffer(`${base}/offer/vpn?ref=not-hex`), /reference/);
  } finally {
    srv.close();
  }
});
