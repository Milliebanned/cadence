import { canonical, sha256Hex } from "./canonical.ts";
import { memoFor } from "./invoice.ts";
import type { Invoice, Mandate, MandateState, Network } from "./types.ts";

type MandateInput = Omit<Mandate, "v" | "id">;

export function createMandate(input: MandateInput): Mandate {
  const body = { v: 1 as const, ...input };
  const { payee } = input;
  if (payee.mode === "merchant") {
    if (!/^[0-9a-f]{64}$/.test(payee.merchantKey)) throw new Error("merchantKey must be 32 bytes of hex");
  } else if (payee.mode === "address") {
    if (networkOfAddress(payee.address) !== input.network) throw new Error("payee address is not on the mandate's network");
  } else {
    throw new Error("unknown payee mode");
  }
  if (!Number.isSafeInteger(input.amountZat) || input.amountZat <= 0) throw new Error("amountZat must be a positive integer");
  if (input.periodSec < 60) throw new Error("periodSec must be at least 60");
  if (input.maxCycles < 1) throw new Error("maxCycles must be at least 1");
  if (input.expiresAt <= input.startAt) throw new Error("expiresAt must be after startAt");
  if (input.jitterSec < 0 || input.jitterSec >= input.periodSec) throw new Error("jitterSec must be inside one period");
  return { ...body, id: sha256Hex(canonical(body)) };
}

export function freshState(): MandateState {
  return { revoked: false, cyclesPaid: 0, totalPaidZat: 0, usedAddresses: [], lastPaidAt: null, sendAt: {}, pending: null };
}

export function maxTotalZat(m: Mandate): number {
  return m.amountZat * m.maxCycles;
}

/** Unix time at which cycle n (1-based) becomes due. */
export function dueAtForCycle(m: Mandate, cycle: number): number {
  return m.startAt + (cycle - 1) * m.periodSec;
}

/** The payment for a cycle in address mode, built from the mandate alone. */
export function localInvoice(m: Mandate, cycle: number): Invoice {
  if (m.payee.mode !== "address") throw new Error("local invoices exist only in address mode");
  return {
    v: 1,
    mandateId: m.id,
    cycle,
    address: m.payee.address,
    amountZat: m.amountZat,
    memo: memoFor(m.id, cycle),
    dueAt: dueAtForCycle(m, cycle),
  };
}

export function networkOfAddress(address: string): Network | null {
  if (/^(u1|zs1|t1|t3)/.test(address)) return "main";
  if (/^(utest1|ztestsapling1|tm|t2)/.test(address)) return "test";
  // Regtest shares the testnet transparent prefixes; only shielded encodings are told apart.
  if (/^(uregtest1|zregtestsapling1)/.test(address)) return "regtest";
  return null;
}
