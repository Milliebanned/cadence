import { canonical, sha256Hex } from "./canonical.ts";
import type { Mandate, MandateState, Network } from "./types.ts";

type MandateInput = Omit<Mandate, "v" | "id">;

export function createMandate(input: MandateInput): Mandate {
  const body = { v: 1 as const, ...input };
  if (!/^[0-9a-f]{64}$/.test(input.merchantKey)) throw new Error("merchantKey must be 32 bytes of hex");
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

export function networkOfAddress(address: string): Network | null {
  if (/^(u1|zs1|t1|t3)/.test(address)) return "main";
  if (/^(utest1|ztestsapling1|tm)/.test(address)) return "test";
  return null;
}
