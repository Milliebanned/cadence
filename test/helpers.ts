import { generateMerchantKeys, memoFor, signInvoice } from "../src/invoice.ts";
import { createMandate, dueAtForCycle } from "../src/mandate.ts";
import type { Invoice, Mandate } from "../src/types.ts";

export const T0 = 1_800_000_000;
export const DAY = 86_400;

export const merchant = generateMerchantKeys();

export function makeMandate(over: Partial<Parameters<typeof createMandate>[0]> = {}): Mandate {
  return createMandate({
    network: "test",
    merchantKey: merchant.publicKeyHex,
    planId: "plan-pro",
    amountZat: 5_000_000,
    periodSec: 30 * DAY,
    maxCycles: 3,
    startAt: T0,
    expiresAt: T0 + 120 * DAY,
    graceSec: 3 * DAY,
    jitterSec: 6 * 3600,
    ...over,
  });
}

let counter = 0;
export function makeInvoice(m: Mandate, cycle: number, over: Partial<Invoice> = {}, secret = merchant.secretKeyHex): Invoice {
  counter += 1;
  const base: Omit<Invoice, "sig"> = {
    v: 1,
    mandateId: m.id,
    cycle,
    address: `utest1cycle${cycle}n${counter}`.padEnd(40, "q"),
    amountZat: m.amountZat,
    memo: memoFor(m.id, cycle),
    dueAt: dueAtForCycle(m, cycle),
    ...over,
  };
  return signInvoice(base, secret);
}
