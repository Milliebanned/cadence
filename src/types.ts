export type Network = "main" | "test";

/** What the subscriber agrees to. The merchant is bound by key, not by address,
 *  so every cycle can use a fresh address without weakening the limits. */
export interface Mandate {
  v: 1;
  id: string;
  network: Network;
  merchantKey: string; // ed25519 public key, hex
  planId: string;
  amountZat: number; // exact amount per cycle
  periodSec: number;
  maxCycles: number;
  startAt: number; // unix seconds, first cycle is due here
  expiresAt: number;
  graceSec: number; // an invoice is accepted this long after its due time
  jitterSec: number; // the agent sends at a random point inside this window
}

/** Issued by the merchant, one per cycle, signed with the merchant key. */
export interface Invoice {
  v: 1;
  mandateId: string;
  cycle: number; // 1-based
  address: string; // fresh shielded address for this cycle
  amountZat: number;
  memo: string;
  dueAt: number;
  sig?: string; // hex ed25519 over canonical(invoice without sig)
}

export interface MandateState {
  revoked: boolean;
  cyclesPaid: number;
  totalPaidZat: number;
  usedAddresses: string[];
  lastPaidAt: number | null;
  /** send time chosen per cycle, kept so a restart does not re-roll it */
  sendAt: Record<string, number>;
  /** a send that started but is not confirmed; blocks a second payment for the cycle */
  pending: { cycle: number; address: string; startedAt: number } | null;
}

export type Decision = { ok: true } | { ok: false; reasons: string[] };

export interface AddressInfo {
  network: Network;
  /** receivers the wallet decoded from the address */
  receivers: Array<"orchard" | "sapling" | "transparent">;
}
