import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { Agent } from "../src/agent.ts";
import { createMandate } from "../src/mandate.ts";
import { Merchant, signWebhook, type MerchantEvent, type Plan } from "../src/merchant.ts";
import { decodeMemo, displayTxid } from "../src/scan.ts";
import { MockWallet } from "../src/wallet.ts";
import type { ReceivedPayment } from "../src/scan.ts";
import { DAY, T0, merchant as keys } from "./helpers.ts";

const PLAN: Plan = { id: "pro", name: "Pro", amountZat: 5_000_000, periodSec: 30 * DAY, maxCycles: 12, graceSec: 3 * DAY };

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "cadence-m-"));
  let n = 0;
  const events: MerchantEvent[] = [];
  const m = new Merchant({
    network: "test",
    keys,
    plans: [PLAN],
    storePath: join(dir, "merchant.json"),
    newAddress: async () => `utest1merchantaddr${++n}`.padEnd(48, "x"),
    onEvent: (e) => events.push(e),
  });
  const offer = m.offer("pro");
  const mandate = createMandate({
    network: offer.network,
    payee: { mode: "merchant", merchantKey: offer.merchantKey },
    planId: offer.plan.id,
    amountZat: offer.plan.amountZat,
    periodSec: offer.plan.periodSec,
    maxCycles: 3,
    startAt: T0,
    expiresAt: T0 + 100 * DAY,
    graceSec: offer.plan.graceSec,
    jitterSec: 3600,
  });
  return { dir, m, mandate, events };
}

function paymentFor(address: string, value: number, memo: string | null, txid = "f".repeat(64)): ReceivedPayment {
  return { txid, minedHeight: 100, pool: "orchard", address, valueZat: value, memo };
}

test("a mandate that does not match the plan is rejected", () => {
  const { m, mandate } = setup();
  assert.throws(() => m.register({ ...mandate, amountZat: 1 }, T0), /amount differs/);
});

test("each cycle gets its own address, and asking twice returns the same invoice", async () => {
  const { m, mandate } = setup();
  m.register(mandate, T0);
  const a = await m.invoice(mandate.id, 1, T0 + 1);
  const b = await m.invoice(mandate.id, 1, T0 + 2);
  assert.deepEqual(a, b);
  const c = await m.invoice(mandate.id, 2, T0 + 30 * DAY + 1);
  assert.notEqual(a.address, c.address);
  await assert.rejects(m.invoice(mandate.id, 3, T0 + 31 * DAY), /not due/);
});

test("payments are matched by address and paid once", async () => {
  const { m, mandate, events } = setup();
  m.register(mandate, T0);
  const inv = await m.invoice(mandate.id, 1, T0 + 1);
  assert.deepEqual(m.reconcile([paymentFor(inv.address, 4_999_999, inv.memo)], T0 + 5), [], "underpayment ignored");
  assert.deepEqual(m.reconcile([paymentFor("utest1someoneelse", 5_000_000, inv.memo)], T0 + 5), []);
  const paid = m.reconcile([paymentFor(inv.address, 5_000_000, inv.memo)], T0 + 5);
  assert.equal(paid.length, 1);
  assert.deepEqual(m.reconcile([paymentFor(inv.address, 5_000_000, inv.memo)], T0 + 6), [], "no double count");
  assert.ok(events.some((e) => e.type === "invoice.paid" && e.cycle === 1));
  assert.equal(m.status(mandate.id, T0 + 10).cyclesPaid, 1);
});

test("a transparent payment to the address is never counted", async () => {
  const { m, mandate } = setup();
  m.register(mandate, T0);
  const inv = await m.invoice(mandate.id, 1, T0 + 1);
  assert.deepEqual(m.reconcile([{ ...paymentFor(inv.address, 5_000_000, null), pool: "transparent" }], T0 + 5), []);
});

test("status moves from active to late to lapsed, and cancel stops invoices", async () => {
  const { m, mandate } = setup();
  m.register(mandate, T0);
  assert.equal(m.status(mandate.id, T0).status, "active");
  assert.equal(m.status(mandate.id, T0 + DAY).status, "late");
  assert.equal(m.status(mandate.id, T0 + 4 * DAY).status, "lapsed");
  m.cancel(mandate.id, T0 + 5 * DAY);
  assert.equal(m.status(mandate.id, T0 + 5 * DAY).status, "cancelled");
  await assert.rejects(m.invoice(mandate.id, 1, T0 + 5 * DAY), /cancelled/);
});

test("merchant and agent run a full subscription together", async () => {
  const { m, mandate } = setup();
  m.register(mandate, T0);
  const dir = mkdtempSync(join(tmpdir(), "cadence-a-"));
  const wallet = new MockWallet();
  const agent = new Agent({
    storePath: join(dir, "agent.json"),
    auditPath: join(dir, "audit.log"),
    wallet,
    getInvoice: (md, cycle) => m.invoice(md.id, cycle, T0 + (cycle - 1) * 30 * DAY + 10),
  });
  agent.subscribe(mandate, T0);
  for (let c = 1; c <= 3; c++) {
    const now = T0 + (c - 1) * 30 * DAY + 10;
    const [r] = await agent.tick(now, () => 0);
    assert.equal(r!.action, "paid", JSON.stringify(r));
    const sent = wallet.sent.at(-1)!;
    m.reconcile([paymentFor(sent.address, sent.amountZat, sent.memo, `${c}`.repeat(64))], now + 60);
  }
  assert.equal(m.status(mandate.id, T0 + 70 * DAY).status, "complete");
  assert.equal(new Set(wallet.sent.map((s) => s.address)).size, 3);
});

test("webhook signatures verify with the shared secret", () => {
  const { body, signature } = signWebhook({ type: "invoice.paid", at: 1, mandateId: "m", cycle: 1, txid: "t" }, "s3cret");
  assert.equal(signature, createHmac("sha256", "s3cret").update(body).digest("hex"));
});

test("memo and txid decoding", () => {
  const memo = Buffer.alloc(512);
  memo.write("cadence:v1:abcd1234:1");
  assert.equal(decodeMemo(memo), "cadence:v1:abcd1234:1");
  assert.equal(decodeMemo(Buffer.from([0xf6, ...Buffer.alloc(511)])), null, "empty memo");
  assert.equal(displayTxid(Uint8Array.from([1, 2, 3])), "030201");
});
