import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "../src/agent.ts";
import { createMandate, freshState, localInvoice } from "../src/mandate.ts";
import { evaluate } from "../src/policy.ts";
import { MockWallet } from "../src/wallet.ts";
import { DAY, T0 } from "./helpers.ts";

const PAYEE = "utest1payeeaddressforaddressmodexxxxxxxxxxxxx";

function addressMandate() {
  return createMandate({
    network: "test",
    payee: { mode: "address", address: PAYEE },
    planId: "rent",
    amountZat: 2_000_000,
    periodSec: 30 * DAY,
    maxCycles: 3,
    startAt: T0,
    expiresAt: T0 + 120 * DAY,
    graceSec: 3 * DAY,
    jitterSec: 3600,
  });
}

test("address mode pays the same shielded address every cycle with no merchant involved", async () => {
  const m = addressMandate();
  const wallet = new MockWallet();
  const dir = mkdtempSync(join(tmpdir(), "cadence-"));
  const agent = new Agent({ storePath: join(dir, "a.json"), auditPath: join(dir, "a.log"), wallet });
  agent.subscribe(m, T0);
  for (let c = 1; c <= 3; c++) {
    const [r] = await agent.tick(T0 + (c - 1) * 30 * DAY + 5, () => 0);
    assert.equal(r!.action, "paid", JSON.stringify(r));
  }
  assert.deepEqual(
    wallet.sent.map((s) => s.address),
    [PAYEE, PAYEE, PAYEE],
  );
  const [done] = await agent.tick(T0 + 400 * DAY, () => 0);
  assert.equal(done!.action, "idle");
});

test("address mode refuses an invoice that redirects payment elsewhere", () => {
  const m = addressMandate();
  const inv = { ...localInvoice(m, 1), address: "utest1attackeraddressxxxxxxxxxxxxxxxxxxxxxxxx" };
  const d = evaluate(m, freshState(), inv, { network: "test", receivers: ["orchard"] }, T0 + 5);
  assert.equal(d.ok, false);
  assert.ok(!d.ok && d.reasons.includes("address differs from the mandate's payee"));
});

test("a payee address on the wrong network is rejected when the mandate is created", () => {
  assert.throws(
    () =>
      createMandate({
        network: "test",
        payee: { mode: "address", address: "u1mainnetaddressxxxxxxxxxxxxxxxxx" },
        planId: "x",
        amountZat: 1,
        periodSec: 3600,
        maxCycles: 1,
        startAt: T0,
        expiresAt: T0 + DAY,
        graceSec: 60,
        jitterSec: 0,
      }),
    /network/,
  );
});
