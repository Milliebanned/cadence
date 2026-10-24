import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/policy.ts";
import { freshState } from "../src/mandate.ts";
import { generateMerchantKeys } from "../src/invoice.ts";
import type { AddressInfo, Decision } from "../src/types.ts";
import { DAY, T0, makeInvoice, makeMandate } from "./helpers.ts";

const shielded: AddressInfo = { network: "test", receivers: ["orchard"] };

function refusedWith(d: Decision, text: string): void {
  assert.equal(d.ok, false);
  assert.ok(!d.ok && d.reasons.some((r) => r.includes(text)), `expected "${text}" in ${JSON.stringify(d)}`);
}

test("a correct first-cycle invoice is accepted", () => {
  const m = makeMandate();
  assert.deepEqual(evaluate(m, freshState(), makeInvoice(m, 1), shielded, T0 + 60), { ok: true });
});

test("an invoice signed by a different key is refused", () => {
  const m = makeMandate();
  const other = generateMerchantKeys();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1, {}, other.secretKeyHex), shielded, T0 + 60), "signature");
});

test("a tampered amount is refused, even with a valid signature on the original", () => {
  const m = makeMandate();
  const inv = { ...makeInvoice(m, 1), amountZat: m.amountZat * 10 };
  const d = evaluate(m, freshState(), inv, shielded, T0 + 60);
  refusedWith(d, "signature");
  refusedWith(d, "amount differs");
});

test("a correctly signed invoice that asks for more than the mandate is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1, { amountZat: m.amountZat + 1 }), shielded, T0 + 60), "amount differs");
});

test("charging early is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1), shielded, T0 - 10), "not due yet");
});

test("an invoice after the grace period is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1), shielded, T0 + m.graceSec + 1), "grace");
});

test("skipping ahead a cycle is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 2), shielded, T0 + 30 * DAY + 5), "expected cycle 1");
});

test("a revoked mandate is refused", () => {
  const m = makeMandate();
  const s = { ...freshState(), revoked: true };
  refusedWith(evaluate(m, s, makeInvoice(m, 1), shielded, T0 + 60), "revoked");
});

test("an expired mandate is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1), shielded, m.expiresAt + 1), "expired");
});

test("the cycle limit and the total cap hold", () => {
  const m = makeMandate({ maxCycles: 2 });
  const s = { ...freshState(), cyclesPaid: 2, totalPaidZat: m.amountZat * 2 };
  const d = evaluate(m, s, makeInvoice(m, 3), shielded, T0 + 60 * DAY + 5);
  refusedWith(d, "cycle limit");
  refusedWith(d, "total cap");
});

test("an address that was already used is refused", () => {
  const m = makeMandate();
  const inv = makeInvoice(m, 1);
  const s = { ...freshState(), usedAddresses: [inv.address] };
  refusedWith(evaluate(m, s, inv, shielded, T0 + 60), "already used");
});

test("a transparent address is refused", () => {
  const m = makeMandate();
  const inv = makeInvoice(m, 1, { address: "tmQ4v7fK2examplexxxxxxxxxxxxxxxxxxxx" });
  refusedWith(evaluate(m, freshState(), inv, { network: "test", receivers: ["transparent"] }, T0 + 60), "no shielded receiver");
});

test("a unified address that also carries a transparent receiver is refused", () => {
  const m = makeMandate();
  refusedWith(
    evaluate(m, freshState(), makeInvoice(m, 1), { network: "test", receivers: ["orchard", "transparent"] }, T0 + 60),
    "transparent receiver",
  );
});

test("a mainnet address under a testnet mandate is refused", () => {
  const m = makeMandate();
  const inv = makeInvoice(m, 1, { address: "u1mainnetaddressxxxxxxxxxxxxxxxxxxxxxx" });
  refusedWith(evaluate(m, freshState(), inv, { network: "main", receivers: ["orchard"] }, T0 + 60), "wrong network");
});

test("a free-form memo is refused", () => {
  const m = makeMandate();
  refusedWith(evaluate(m, freshState(), makeInvoice(m, 1, { memo: "thanks for the coffee, alice" }), shielded, T0 + 60), "fixed format");
});
