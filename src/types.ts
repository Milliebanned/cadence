export type Network = "main" | "test" | "regtest";

/** Who gets paid.
 *  - "address": any shielded address the payee already has. Needs nothing from the payee.
 *    Paying one shielded address every cycle is not visible on chain, since the recipient is encrypted.
 *  - "merchant": a merchant that signs one invoice per cycle with a fresh address. The mandate
 *    binds the merchant's key rather than an address, so addresses can rotate without loosening limits. */
export type Payee = { mode: "address"; address: string } | { mode: "merchant"; merchantKey: string };

/** What the subscriber agrees to. */
export interface Mandate {
  v: 1;
  id: string;
  network: Network;
  payee: Payee;
  planId: string;
  amountZat: number; // exact amount per cycle
  periodSec: number;
  maxCycles: number;
  startAt: number; // unix seconds, first cycle is due here
  expiresAt: number;
  graceSec: number; // an invoice is accepted this long after its due time
  jitterSec: number; // the agent sends at a random point inside this window
}

/** One payment. In merchant mode the merchant issues and signs it; in address mode
 *  the agent builds it locally from the mandate and it carries no signature. */
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
