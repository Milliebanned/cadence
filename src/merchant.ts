import { createHmac } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { canonical } from "./canonical.ts";
import { memoFor, signInvoice, type MerchantKeys } from "./invoice.ts";
import { dueAtForCycle } from "./mandate.ts";
import type { ReceivedPayment } from "./scan.ts";
import type { Invoice, Mandate, Network } from "./types.ts";

export interface Plan {
  id: string;
  name: string;
  /** shown on the checkout page */
  description?: string;
  features?: string[];
  amountZat: number;
  periodSec: number;
  maxCycles: number;
  graceSec: number;
}

export interface IssuedInvoice extends Invoice {
  paid: { txid: string; minedHeight: number | null; valueZat: number; seenAt?: number } | null;
}

export interface Subscription {
  mandate: Mandate;
  createdAt: number;
  cancelledAt: number | null;
  invoices: Record<string, IssuedInvoice>; // by cycle
}

export type SubscriptionStatus = "active" | "late" | "lapsed" | "complete" | "cancelled";

interface OverviewRow {
  mandateId: string;
  plan: string;
  amountZat: number;
  dueAt: number | null;
  cyclesPaid: number;
  maxCycles: number;
  status: SubscriptionStatus;
}

export interface MerchantOverview {
  network: Network;
  counts: Record<SubscriptionStatus, number>;
  subscriptions: number;
  receivedZat: number;
  /** payments still allowed by active mandates that fall due within 30 days */
  expected30dZat: number;
  daily: Array<{ day: string; zat: number }>;
  plans: Array<{ id: string; name: string; amountZat: number; periodSec: number; subscribers: number; receivedZat: number }>;
  upcoming: OverviewRow[];
  attention: OverviewRow[];
  payments: Array<{ at: number | null; mandateId: string; plan: string; cycle: number; amountZat: number; txid: string; height: number | null }>;
}

export interface MerchantEvent {
  type: "subscription.created" | "invoice.issued" | "invoice.paid" | "subscription.cancelled";
  at: number;
  mandateId: string;
  cycle?: number;
  txid?: string;
}

interface StoreFile {
  subscriptions: Record<string, Subscription>;
  seenTxOutputs: string[];
  /** checkout reference -> mandate id, so a checkout page can show the outcome */
  refs?: Record<string, string>;
}

export type CheckoutState =
  | { state: "waiting" }
  | { state: "subscribed"; mandateId: string; cyclesPaid: number; maxCycles: number; status: SubscriptionStatus };

/** Holds a signing key for invoices and a source of fresh receive addresses. It never
 *  holds a spending key: addresses come from a view-only wallet, payments are read from it. */
export class Merchant {
  readonly network: Network;
  readonly keys: MerchantKeys;
  readonly plans: Map<string, Plan>;
  private readonly storePath: string;
  private readonly newAddress: () => Promise<string>;
  private readonly onEvent: (e: MerchantEvent) => void;
  private data: StoreFile;

  constructor(opts: {
    network: Network;
    keys: MerchantKeys;
    plans: Plan[];
    storePath: string;
    newAddress: () => Promise<string>;
    onEvent?: (e: MerchantEvent) => void;
  }) {
    this.network = opts.network;
    this.keys = opts.keys;
    this.plans = new Map(opts.plans.map((p) => [p.id, p]));
    this.storePath = opts.storePath;
    this.newAddress = opts.newAddress;
    this.onEvent = opts.onEvent ?? (() => {});
    this.data = existsSync(opts.storePath)
      ? (JSON.parse(readFileSync(opts.storePath, "utf8")) as StoreFile)
      : { subscriptions: {}, seenTxOutputs: [] };
    if (typeof this.data?.subscriptions !== "object" || this.data.subscriptions === null || !Array.isArray(this.data.seenTxOutputs)) {
      throw new Error(`${opts.storePath} is not a merchant state file`);
    }
  }

  private save(): void {
    const tmp = `${this.storePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.storePath);
  }

  /** What a subscriber needs to build a mandate for a plan. */
  offer(planId: string): { network: Network; merchantKey: string; plan: Plan } {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error("unknown plan");
    return { network: this.network, merchantKey: this.keys.publicKeyHex, plan };
  }

  /** Accepts a subscriber's mandate only if it matches the plan exactly. */
  register(mandate: Mandate, now: number, ref?: string): void {
    const plan = this.plans.get(mandate.planId);
    const problems: string[] = [];
    if (!plan) problems.push("unknown plan");
    if (mandate.network !== this.network) problems.push("wrong network");
    if (mandate.payee.mode !== "merchant" || mandate.payee.merchantKey !== this.keys.publicKeyHex)
      problems.push("mandate is not addressed to this merchant");
    if (plan) {
      if (mandate.amountZat !== plan.amountZat) problems.push("amount differs from the plan");
      if (mandate.periodSec !== plan.periodSec) problems.push("period differs from the plan");
      if (mandate.maxCycles > plan.maxCycles) problems.push("more cycles than the plan allows");
      if (mandate.graceSec < plan.graceSec) problems.push("grace shorter than the plan");
    }
    if (this.data.subscriptions[mandate.id]) problems.push("already registered");
    if (problems.length) throw new Error(problems.join("; "));
    this.data.subscriptions[mandate.id] = { mandate, createdAt: now, cancelledAt: null, invoices: {} };
    if (ref) {
      this.data.refs ??= {};
      if (!this.data.refs[ref]) this.data.refs[ref] = mandate.id;
    }
    this.save();
    this.onEvent({ type: "subscription.created", at: now, mandateId: mandate.id });
  }

  /** One invoice per cycle, with an address used for nothing else. Asking again returns the same one. */
  async invoice(mandateId: string, cycle: number, now: number): Promise<Invoice> {
    const sub = this.data.subscriptions[mandateId];
    if (!sub) throw new Error("unknown subscription");
    if (sub.cancelledAt !== null) throw new Error("subscription cancelled");
    const { mandate } = sub;
    if (!Number.isInteger(cycle) || cycle < 1 || cycle > mandate.maxCycles) throw new Error("no such cycle");
    const existing = sub.invoices[String(cycle)];
    if (existing) return stripState(existing);
    if (now < dueAtForCycle(mandate, cycle)) throw new Error("cycle not due yet");

    const inv = signInvoice(
      {
        v: 1,
        mandateId,
        cycle,
        address: await this.newAddress(),
        amountZat: mandate.amountZat,
        memo: memoFor(mandateId, cycle),
        dueAt: dueAtForCycle(mandate, cycle),
      },
      this.keys.secretKeyHex,
    );
    sub.invoices[String(cycle)] = { ...inv, paid: null };
    this.save();
    this.onEvent({ type: "invoice.issued", at: now, mandateId, cycle });
    return inv;
  }

  checkoutState(ref: string, now: number): CheckoutState {
    const id = this.data.refs?.[ref];
    if (!id) return { state: "waiting" };
    const st = this.status(id, now);
    return { state: "subscribed", mandateId: id, cyclesPaid: st.cyclesPaid, maxCycles: this.data.subscriptions[id]!.mandate.maxCycles, status: st.status };
  }

  cancel(mandateId: string, now: number): void {
    const sub = this.data.subscriptions[mandateId];
    if (!sub) throw new Error("unknown subscription");
    if (sub.cancelledAt === null) {
      sub.cancelledAt = now;
      this.save();
      this.onEvent({ type: "subscription.cancelled", at: now, mandateId });
    }
  }

  /** Matches received payments to invoices by the per-cycle address. Returns newly paid invoices. */
  reconcile(payments: ReceivedPayment[], now: number): Array<{ mandateId: string; cycle: number; txid: string }> {
    const byAddress = new Map<string, { sub: Subscription; inv: IssuedInvoice }>();
    for (const sub of Object.values(this.data.subscriptions)) {
      for (const inv of Object.values(sub.invoices)) byAddress.set(inv.address, { sub, inv });
    }
    const seen = new Set(this.data.seenTxOutputs);
    const newlyPaid: Array<{ mandateId: string; cycle: number; txid: string }> = [];

    for (const p of payments) {
      if (!p.address || p.pool === "transparent") continue;
      const key = `${p.txid}:${p.address}:${p.valueZat}`;
      if (seen.has(key)) continue;
      const hit = byAddress.get(p.address);
      if (!hit || hit.inv.paid) continue;
      // Value must cover the invoice. The memo is checked but not required, since a wallet may drop it.
      if (p.valueZat < hit.inv.amountZat) continue;
      if (p.memo !== null && p.memo !== hit.inv.memo) continue;
      hit.inv.paid = { txid: p.txid, minedHeight: p.minedHeight, valueZat: p.valueZat, seenAt: now };
      seen.add(key);
      newlyPaid.push({ mandateId: hit.inv.mandateId, cycle: hit.inv.cycle, txid: p.txid });
    }
    if (newlyPaid.length) {
      this.data.seenTxOutputs = [...seen];
      this.save();
      for (const n of newlyPaid) this.onEvent({ type: "invoice.paid", at: now, ...n });
    }
    return newlyPaid;
  }

  status(mandateId: string, now: number): { status: SubscriptionStatus; cyclesPaid: number; nextDueAt: number | null } {
    const sub = this.data.subscriptions[mandateId];
    if (!sub) throw new Error("unknown subscription");
    const { mandate } = sub;
    let cyclesPaid = 0;
    while (sub.invoices[String(cyclesPaid + 1)]?.paid) cyclesPaid++;
    if (sub.cancelledAt !== null) return { status: "cancelled", cyclesPaid, nextDueAt: null };
    if (cyclesPaid >= mandate.maxCycles) return { status: "complete", cyclesPaid, nextDueAt: null };
    const nextDueAt = dueAtForCycle(mandate, cyclesPaid + 1);
    if (now <= nextDueAt) return { status: "active", cyclesPaid, nextDueAt };
    if (now <= nextDueAt + mandate.graceSec) return { status: "late", cyclesPaid, nextDueAt };
    return { status: "lapsed", cyclesPaid, nextDueAt };
  }

  subscriptions(): Subscription[] {
    return Object.values(this.data.subscriptions);
  }

  /** Everything the dashboard shows, computed from the merchant's own records. */
  overview(now: number, days = 14): MerchantOverview {
    const DAY = 86_400;
    const subs = this.subscriptions();
    const planName = (id: string) => this.plans.get(id)?.name ?? id;
    const counts: Record<SubscriptionStatus, number> = { active: 0, late: 0, lapsed: 0, complete: 0, cancelled: 0 };
    const upcoming: MerchantOverview["upcoming"] = [];
    const attention: MerchantOverview["attention"] = [];
    const payments: MerchantOverview["payments"] = [];
    let receivedZat = 0;
    let expectedZat = 0;
    const perPlan = new Map<string, { subscribers: number; receivedZat: number }>();

    for (const sub of subs) {
      const { mandate } = sub;
      const st = this.status(mandate.id, now);
      counts[st.status]++;
      const plan = perPlan.get(mandate.planId) ?? { subscribers: 0, receivedZat: 0 };
      if (st.status === "active" || st.status === "late") {
        plan.subscribers++;
        // Only payments the mandate still allows and that fall due in the next 30 days.
        for (let c = st.cyclesPaid + 1; c <= mandate.maxCycles; c++) {
          const due = dueAtForCycle(mandate, c);
          if (due > now + 30 * DAY || due >= mandate.expiresAt) break;
          expectedZat += mandate.amountZat;
        }
      }
      const row = { mandateId: mandate.id, plan: planName(mandate.planId), amountZat: mandate.amountZat, dueAt: st.nextDueAt, cyclesPaid: st.cyclesPaid, maxCycles: mandate.maxCycles, status: st.status };
      if ((st.status === "active" || st.status === "late") && st.nextDueAt !== null) upcoming.push(row);
      if (st.status === "late" || st.status === "lapsed") attention.push(row);
      for (const inv of Object.values(sub.invoices)) {
        if (!inv.paid) continue;
        receivedZat += inv.paid.valueZat;
        plan.receivedZat += inv.paid.valueZat;
        payments.push({
          at: inv.paid.seenAt ?? null,
          mandateId: mandate.id,
          plan: planName(mandate.planId),
          cycle: inv.cycle,
          amountZat: inv.paid.valueZat,
          txid: inv.paid.txid,
          height: inv.paid.minedHeight,
        });
      }
      perPlan.set(mandate.planId, plan);
    }

    const today = Math.floor(now / DAY);
    const daily = Array.from({ length: days }, (_, i) => {
      const d = today - (days - 1 - i);
      return { day: new Date(d * DAY * 1000).toISOString().slice(0, 10), zat: 0 };
    });
    for (const p of payments) {
      if (p.at === null) continue;
      const idx = Math.floor(p.at / DAY) - (today - (days - 1));
      if (idx >= 0 && idx < days) daily[idx]!.zat += p.amountZat;
    }

    upcoming.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
    payments.sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || (b.height ?? 0) - (a.height ?? 0));
    return {
      network: this.network,
      counts,
      subscriptions: subs.length,
      receivedZat,
      expected30dZat: expectedZat,
      daily,
      plans: [...this.plans.values()].map((p) => ({ id: p.id, name: p.name, amountZat: p.amountZat, periodSec: p.periodSec, ...(perPlan.get(p.id) ?? { subscribers: 0, receivedZat: 0 }) })),
      upcoming: upcoming.slice(0, 12),
      attention,
      payments: payments.slice(0, 40),
    };
  }
}

function stripState(inv: IssuedInvoice): Invoice {
  const { paid: _paid, ...rest } = inv;
  return rest;
}

/** Webhook body and signature header value (hex HMAC-SHA256 over the exact body). */
export function signWebhook(event: MerchantEvent, secret: string): { body: string; signature: string } {
  const body = canonical(event);
  return { body, signature: createHmac("sha256", secret).update(body).digest("hex") };
}
