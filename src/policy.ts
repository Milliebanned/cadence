import { dueAtForCycle, maxTotalZat, networkOfAddress } from "./mandate.ts";
import { memoFor, verifyInvoice } from "./invoice.ts";
import type { AddressInfo, Decision, Invoice, Mandate, MandateState } from "./types.ts";

const MAX_MEMO_BYTES = 512;

/** Decides whether the agent may pay this invoice. Every rule is checked and
 *  every failure is reported, so a refusal can be shown to the subscriber. */
export function evaluate(
  mandate: Mandate,
  state: MandateState,
  invoice: Invoice,
  address: AddressInfo,
  now: number,
): Decision {
  const reasons: string[] = [];

  if (state.revoked) reasons.push("mandate revoked");
  if (now >= mandate.expiresAt) reasons.push("mandate expired");
  if (now < mandate.startAt) reasons.push("mandate not started");

  if (invoice.mandateId !== mandate.id) reasons.push("invoice is for a different mandate");
  const { payee } = mandate;
  if (payee.mode === "merchant") {
    if (!verifyInvoice(invoice, payee.merchantKey)) reasons.push("invoice signature does not match the merchant key");
    if (state.usedAddresses.includes(invoice.address)) reasons.push("address was already used");
  } else if (invoice.address !== payee.address) {
    reasons.push("address differs from the mandate's payee");
  }

  const expectedCycle = state.cyclesPaid + 1;
  if (invoice.cycle !== expectedCycle) reasons.push(`expected cycle ${expectedCycle}, got ${invoice.cycle}`);
  if (invoice.cycle > mandate.maxCycles) reasons.push("cycle limit reached");

  if (invoice.amountZat !== mandate.amountZat) reasons.push("amount differs from the mandate");
  if (state.totalPaidZat + invoice.amountZat > maxTotalZat(mandate)) reasons.push("total cap exceeded");

  const due = dueAtForCycle(mandate, invoice.cycle);
  if (invoice.dueAt !== due) reasons.push("invoice due time does not match the mandate schedule");
  if (now < due) reasons.push("not due yet");
  if (now > due + mandate.graceSec) reasons.push("invoice is past its grace period");

  if (networkOfAddress(invoice.address) !== mandate.network) reasons.push("address is on the wrong network");
  if (address.network !== mandate.network) reasons.push("wallet decoded the address on a different network");
  if (!address.receivers.some((r) => r === "orchard" || r === "sapling")) reasons.push("address has no shielded receiver");
  if (address.receivers.includes("transparent")) reasons.push("address exposes a transparent receiver");

  if (invoice.memo !== memoFor(mandate.id, invoice.cycle)) reasons.push("memo is not in the fixed format");
  if (Buffer.byteLength(invoice.memo) > MAX_MEMO_BYTES) reasons.push("memo too long");

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}
