import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { AuditLog } from "./audit.ts";
import { evaluate } from "./policy.ts";
import { freshState } from "./mandate.ts";
import { pickSendTime } from "./schedule.ts";
import type { Invoice, Mandate, MandateState } from "./types.ts";
import type { WalletAdapter } from "./wallet.ts";

interface StoreFile {
  mandates: Record<string, { mandate: Mandate; state: MandateState }>;
}

export type InvoiceProvider = (mandate: Mandate, cycle: number) => Promise<Invoice>;

export type TickResult =
  | { mandateId: string; action: "paid"; cycle: number; txid: string }
  | { mandateId: string; action: "refused"; cycle: number; reasons: string[] }
  | { mandateId: string; action: "waiting"; cycle: number; sendAt: number }
  | { mandateId: string; action: "blocked"; reason: string }
  | { mandateId: string; action: "failed"; cycle: number; error: string }
  | { mandateId: string; action: "idle"; reason: string };

export class Agent {
  private readonly storePath: string;
  private readonly audit: AuditLog;
  private readonly wallet: WalletAdapter;
  private readonly getInvoice: InvoiceProvider;
  private data: StoreFile;

  constructor(opts: { storePath: string; auditPath: string; wallet: WalletAdapter; getInvoice: InvoiceProvider }) {
    this.storePath = opts.storePath;
    this.audit = new AuditLog(opts.auditPath);
    this.wallet = opts.wallet;
    this.getInvoice = opts.getInvoice;
    this.data = existsSync(opts.storePath)
      ? (JSON.parse(readFileSync(opts.storePath, "utf8")) as StoreFile)
      : { mandates: {} };
  }

  private save(): void {
    const tmp = `${this.storePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.storePath);
  }

  subscribe(mandate: Mandate, now: number): void {
    if (this.data.mandates[mandate.id]) throw new Error("mandate already exists");
    this.data.mandates[mandate.id] = { mandate, state: freshState() };
    this.save();
    this.audit.append("subscribe", { mandateId: mandate.id, planId: mandate.planId, amountZat: mandate.amountZat }, now);
  }

  revoke(mandateId: string, now: number): void {
    const entry = this.data.mandates[mandateId];
    if (!entry) throw new Error("unknown mandate");
    entry.state.revoked = true;
    this.save();
    this.audit.append("revoke", { mandateId }, now);
  }

  /** Confirms the pending send of a cycle really happened or really did not. */
  resolvePending(mandateId: string, outcome: "paid" | "not-paid", now: number): void {
    const entry = this.data.mandates[mandateId];
    if (!entry?.state.pending) throw new Error("nothing pending");
    const { state, mandate } = entry;
    const pending = state.pending!;
    if (outcome === "paid") {
      state.cyclesPaid = pending.cycle;
      state.totalPaidZat += mandate.amountZat;
      state.usedAddresses.push(pending.address);
      state.lastPaidAt = now;
    }
    state.pending = null;
    this.save();
    this.audit.append("resolve-pending", { mandateId, cycle: pending.cycle, outcome }, now);
  }

  stateOf(mandateId: string): MandateState {
    const entry = this.data.mandates[mandateId];
    if (!entry) throw new Error("unknown mandate");
    return entry.state;
  }

  mandateIds(): string[] {
    return Object.keys(this.data.mandates);
  }

  async tick(now: number, rand?: (maxExclusive: number) => number): Promise<TickResult[]> {
    const results: TickResult[] = [];
    for (const [mandateId, { mandate, state }] of Object.entries(this.data.mandates)) {
      results.push(await this.tickOne(mandateId, mandate, state, now, rand));
    }
    return results;
  }

  private async tickOne(
    mandateId: string,
    mandate: Mandate,
    state: MandateState,
    now: number,
    rand?: (maxExclusive: number) => number,
  ): Promise<TickResult> {
    if (state.revoked) return { mandateId, action: "idle", reason: "revoked" };
    if (state.pending) return { mandateId, action: "blocked", reason: "a send is pending confirmation" };
    if (state.cyclesPaid >= mandate.maxCycles) return { mandateId, action: "idle", reason: "all cycles paid" };
    if (now >= mandate.expiresAt) return { mandateId, action: "idle", reason: "expired" };

    const cycle = state.cyclesPaid + 1;
    const key = String(cycle);
    if (state.sendAt[key] === undefined) {
      state.sendAt[key] = pickSendTime(mandate, cycle, rand);
      this.save();
    }
    const sendAt = state.sendAt[key]!;
    if (now < sendAt) return { mandateId, action: "waiting", cycle, sendAt };

    let invoice: Invoice;
    try {
      invoice = await this.getInvoice(mandate, cycle);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.audit.append("invoice-unavailable", { mandateId, cycle, error }, now);
      return { mandateId, action: "failed", cycle, error };
    }

    const addressInfo = await this.wallet.inspectAddress(invoice.address);
    const decision = evaluate(mandate, state, invoice, addressInfo, now);
    if (!decision.ok) {
      this.audit.append("refused", { mandateId, cycle, reasons: decision.reasons }, now);
      return { mandateId, action: "refused", cycle, reasons: decision.reasons };
    }

    // Write-ahead: record the intent first, so a crash mid-send can never cause a second payment.
    state.pending = { cycle, address: invoice.address, startedAt: now };
    this.save();
    this.audit.append("sending", { mandateId, cycle, amountZat: invoice.amountZat }, now);

    try {
      const { txid } = await this.wallet.sendShielded(invoice.address, invoice.amountZat, invoice.memo);
      state.cyclesPaid = cycle;
      state.totalPaidZat += invoice.amountZat;
      state.usedAddresses.push(invoice.address);
      state.lastPaidAt = now;
      state.pending = null;
      this.save();
      this.audit.append("paid", { mandateId, cycle, txid }, now);
      return { mandateId, action: "paid", cycle, txid };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      // The send may or may not have reached the network. Stay pending until a human resolves it.
      this.audit.append("send-error", { mandateId, cycle, error }, now);
      return { mandateId, action: "failed", cycle, error };
    }
  }
}
