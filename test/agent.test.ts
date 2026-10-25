import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "../src/agent.ts";
import { AuditLog } from "../src/audit.ts";
import { pickSendTime } from "../src/schedule.ts";
import { MockWallet } from "../src/wallet.ts";
import type { Mandate } from "../src/types.ts";
import { DAY, T0, makeInvoice, makeMandate } from "./helpers.ts";

function setup(m: Mandate = makeMandate()) {
  const dir = mkdtempSync(join(tmpdir(), "cadence-"));
  const wallet = new MockWallet();
  const agent = new Agent({
    storePath: join(dir, "agent.json"),
    auditPath: join(dir, "audit.log"),
    wallet,
    getInvoice: async (mandate, cycle) => makeInvoice(mandate, cycle),
  });
  agent.subscribe(m, T0);
  return { dir, wallet, agent, m, auditPath: join(dir, "audit.log") };
}

const zero = () => 0;

test("subscribe, three renewals, then nothing more is paid", async () => {
  const { agent, wallet, m } = setup();
  for (let cycle = 1; cycle <= 3; cycle++) {
    const now = T0 + (cycle - 1) * 30 * DAY + 10;
    const [r] = await agent.tick(now, zero);
    assert.equal(r!.action, "paid", JSON.stringify(r));
  }
  assert.equal(wallet.sent.length, 3);
  assert.equal(new Set(wallet.sent.map((s) => s.address)).size, 3, "every cycle used a new address");
  assert.ok(wallet.sent.every((s) => s.amountZat === m.amountZat));
  const [after] = await agent.tick(T0 + 200 * DAY, zero);
  assert.equal(after!.action, "idle");
  assert.equal(wallet.sent.length, 3);
});

test("nothing is sent before the chosen send time", async () => {
  const { agent, wallet } = setup();
  const [r] = await agent.tick(T0 + 5, () => 3600);
  assert.equal(r!.action, "waiting");
  assert.equal(wallet.sent.length, 0);
});

test("after revoke the agent never pays again", async () => {
  const { agent, wallet, m } = setup();
  await agent.tick(T0 + 10, zero);
  agent.revoke(m.id, T0 + 100);
  const [r] = await agent.tick(T0 + 31 * DAY, zero);
  assert.equal(r!.action, "idle");
  assert.equal(wallet.sent.length, 1);
});

test("a send that errors blocks a second payment until a human resolves it", async () => {
  const { agent, wallet, m } = setup();
  wallet.failNext = true;
  const [first] = await agent.tick(T0 + 10, zero);
  assert.equal(first!.action, "failed");
  const [second] = await agent.tick(T0 + 20, zero);
  assert.equal(second!.action, "blocked");
  assert.equal(wallet.sent.length, 0);
  agent.resolvePending(m.id, "not-paid", T0 + 30);
  const [third] = await agent.tick(T0 + 40, zero);
  assert.equal(third!.action, "paid");
  assert.equal(wallet.sent.length, 1);
});

test("a failed preflight (no funds, sync error) does not mark the cycle pending", async () => {
  const { agent, wallet, m } = setup();
  wallet.preflightError = "refusing: shielded spendable 0 zat";
  const [first] = await agent.tick(T0 + 10, zero);
  assert.equal(first!.action, "failed");
  assert.equal(agent.stateOf(m.id).pending, null);
  wallet.preflightError = null;
  const [second] = await agent.tick(T0 + 20, zero);
  assert.equal(second!.action, "paid");
});

test("the chosen send time survives a restart", async () => {
  const { dir, agent, wallet, m } = setup();
  const [a] = await agent.tick(T0 + 5, () => 7200);
  assert.equal(a!.action, "waiting");
  const restarted = new Agent({
    storePath: join(dir, "agent.json"),
    auditPath: join(dir, "audit.log"),
    wallet,
    getInvoice: async (mandate, cycle) => makeInvoice(mandate, cycle),
  });
  const [b] = await restarted.tick(T0 + 5, () => 0);
  assert.equal(b!.action, "waiting");
  assert.equal(b!.action === "waiting" ? b.sendAt : -1, T0 + 7200);
  assert.equal(restarted.stateOf(m.id).cyclesPaid, 0);
});

test("an invoice with a wrong amount is refused and nothing is sent", async () => {
  const m = makeMandate();
  const dir = mkdtempSync(join(tmpdir(), "cadence-"));
  const wallet = new MockWallet();
  const agent = new Agent({
    storePath: join(dir, "agent.json"),
    auditPath: join(dir, "audit.log"),
    wallet,
    getInvoice: async (mandate, cycle) => makeInvoice(mandate, cycle, { amountZat: mandate.amountZat * 3 }),
  });
  agent.subscribe(m, T0);
  const [r] = await agent.tick(T0 + 10, zero);
  assert.equal(r!.action, "refused");
  assert.equal(wallet.sent.length, 0);
});

test("the audit log verifies, and editing a line is detected", async () => {
  const { agent, auditPath } = setup();
  await agent.tick(T0 + 10, zero);
  assert.deepEqual(AuditLog.verify(auditPath), { ok: true });
  const tampered = readFileSync(auditPath, "utf8").replace('"amountZat":5000000', '"amountZat":1');
  writeFileSync(auditPath, tampered);
  assert.equal(AuditLog.verify(auditPath).ok, false);
});

test("send times stay inside the jitter window and are not constant", () => {
  const m = makeMandate();
  const times = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const t = pickSendTime(m, 1);
    assert.ok(t >= T0 && t <= T0 + m.jitterSec);
    times.add(t);
  }
  assert.ok(times.size > 100);
});

test("a broadcast payment blocks the next cycle until it is mined", async () => {
  const { agent, wallet, m } = setup();
  const [first] = await agent.tick(T0 + 10, zero);
  assert.equal(first!.action, "paid");
  wallet.status.set(wallet.sent[0]!.txid, "pending");
  const [blocked] = await agent.tick(T0 + 30 * DAY + 10, zero);
  assert.equal(blocked!.action, "confirming");
  assert.equal(wallet.sent.length, 1);
  wallet.status.set(wallet.sent[0]!.txid, "mined");
  const [second] = await agent.tick(T0 + 30 * DAY + 20, zero);
  assert.equal(second!.action, "paid");
  assert.equal(agent.stateOf(m.id).cyclesPaid, 2);
});

test("a payment that expires unmined is reopened and paid again, exactly once", async () => {
  const { agent, wallet, m, auditPath } = setup();
  await agent.tick(T0 + 10, zero);
  const dropped = wallet.sent[0]!;
  wallet.status.set(dropped.txid, "expired");
  const [again] = await agent.tick(T0 + 600, zero);
  assert.equal(again!.action, "paid", JSON.stringify(again));
  assert.equal(again!.action === "paid" ? again.cycle : 0, 1, "the same cycle is paid again");
  const s = agent.stateOf(m.id);
  assert.equal(s.cyclesPaid, 1);
  assert.equal(s.totalPaidZat, m.amountZat, "the dropped payment is not counted");
  assert.equal(wallet.sent.length, 2);
  const events = AuditLog.read(auditPath).map((e) => e.event);
  assert.ok(events.includes("expired-unmined"));
  const [idle] = await agent.tick(T0 + 700, zero);
  assert.equal(idle!.action, "waiting", "nothing more until the next cycle is due");
});
