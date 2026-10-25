import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, checkPayment, renderMarkdown, txViewFromRpc, type Payment, type TxView } from "../src/proof.ts";

// Shapes taken from Zebra's getrawtransaction output for a Cadence payment on regtest.
const SHIELDED_RPC = {
  txid: "63f2a822ce4761f40530fe7201f8388d17fb60a5f13a8e80946ebb47d6650cc4",
  version: 6,
  height: 134,
  vin: [],
  vout: [],
  vShieldedSpend: [],
  vShieldedOutput: [],
  vjoinsplit: [],
  valueBalanceZat: 0,
  orchard: { actions: [], valueBalanceZat: 0 },
  ironwood: { actions: [{}, {}], valueBalanceZat: 10000 },
};

const payment = (over: Partial<Payment> = {}): Payment => ({
  mandateId: "f5e0f75df80df05b55bf8ab549317564a3125e30c8d5568b927cc7021d08fa82",
  cycle: 1,
  txid: SHIELDED_RPC.txid,
  amountZat: 25_000_000,
  address: "uregtest1a",
  payeeMode: "merchant",
  ...over,
});

test("a fully shielded payment passes every check", () => {
  const r = checkPayment(payment(), txViewFromRpc(SHIELDED_RPC));
  assert.ok(r.checks.every((c) => c.pass), JSON.stringify(r.checks.filter((c) => !c.pass)));
  assert.match(r.observerSees, /2 ironwood actions/);
  assert.match(r.observerSees, /fee 10000 zat/);
});

test("a transaction with a transparent output fails, and the amount is caught if it shows", () => {
  const leaky: TxView = txViewFromRpc({
    ...SHIELDED_RPC,
    vout: [{ valueZat: 25_000_000 }],
    ironwood: { actions: [{}, {}], valueBalanceZat: 25_010_000 },
  });
  const r = checkPayment(payment(), leaky);
  const failed = r.checks.filter((c) => !c.pass).map((c) => c.name);
  assert.ok(failed.includes("no transparent outputs"));
  assert.ok(failed.includes("payment amount does not appear anywhere public"));
});

test("shielding into the pool (negative value balance) is flagged as a crossing", () => {
  const r = checkPayment(payment(), txViewFromRpc({ ...SHIELDED_RPC, vin: [{}], ironwood: { actions: [{}, {}], valueBalanceZat: -5000 } }));
  assert.ok(r.checks.some((c) => c.name.startsWith("no value crosses") && !c.pass));
});

test("the report fails if the control is not caught, and passes when it is", () => {
  const good = { payment: payment(), tx: txViewFromRpc(SHIELDED_RPC) };
  const leakyControl = { payment: payment({ txid: "c".repeat(64), cycle: 0 }), tx: txViewFromRpc({ ...SHIELDED_RPC, txid: "c".repeat(64), vout: [{ valueZat: 625_000_000 }], ironwood: {} }) };
  assert.equal(buildReport("regtest", [good], leakyControl).pass, true);
  const fakeControl = { payment: payment({ txid: SHIELDED_RPC.txid }), tx: txViewFromRpc(SHIELDED_RPC) };
  assert.equal(buildReport("regtest", [good], fakeControl).pass, false);
});

test("reused merchant addresses and double payments are caught across payments", () => {
  const tx = txViewFromRpc(SHIELDED_RPC);
  const r = buildReport("regtest", [
    { payment: payment({ cycle: 1, address: "uregtest1same" }), tx },
    { payment: payment({ cycle: 2, address: "uregtest1same" }), tx },
  ]);
  const failed = r.global.filter((c) => !c.pass).map((c) => c.name);
  assert.ok(failed.includes("merchant mode: every cycle paid a different address"));
  assert.ok(failed.includes("each cycle was paid exactly once"));
  assert.equal(r.pass, false);
});

test("markdown report states the result and the limits", () => {
  const md = renderMarkdown(buildReport("regtest", [{ payment: payment(), tx: txViewFromRpc(SHIELDED_RPC) }]));
  assert.match(md, /ALL CHECKS PASS/);
  assert.match(md, /What this does not cover/);
});
