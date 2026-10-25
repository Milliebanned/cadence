import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createMandate } from "./mandate.ts";
import type { Plan } from "./merchant.ts";
import type { Mandate, Network } from "./types.ts";

export const DAY = 86_400;

export interface Offer {
  network: Network;
  merchantKey: string;
  plan: Plan;
}

export function duration(sec: number): string {
  if (sec % DAY === 0) return `${sec / DAY} day${sec === DAY ? "" : "s"}`;
  if (sec % 3600 === 0) return `${sec / 3600} hour${sec === 3600 ? "" : "s"}`;
  if (sec % 60 === 0) return `${sec / 60} minute${sec === 60 ? "" : "s"}`;
  return `${sec} seconds`;
}

export function formatZec(zat: number): string {
  return (zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

export function zecToZat(s: string): number {
  if (!/^\d+(\.\d{1,8})?$/.test(s)) throw new Error(`invalid ZEC amount: ${s}`);
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 1e8 + Number(frac.padEnd(8, "0"));
}

/** Fetches a merchant's offer. The merchant base URL is the offer URL without `/offer/<plan>`. */
export async function fetchOffer(offerUrl: string): Promise<{ offer: Offer; base: string; ref?: string }> {
  const url = new URL(offerUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("offer link must be http(s)");
  if (!/\/offer\/[^/]+$/.test(url.pathname)) throw new Error("not a Cadence offer link (expected …/offer/<plan>)");
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!r.ok) throw new Error(`offer returned ${r.status}`);
  const offer = (await r.json()) as Offer;
  if (!offer?.plan?.id || !/^[0-9a-f]{64}$/.test(offer.merchantKey ?? "")) throw new Error("malformed offer");
  const ref = url.searchParams.get("ref") ?? undefined;
  if (ref !== undefined && !/^[0-9a-f]{32}$/.test(ref)) throw new Error("malformed checkout reference");
  return { offer, base: url.origin + url.pathname.replace(/\/offer\/[^/]+$/, ""), ref };
}

export function mandateFromOffer(offer: Offer, opts: { cycles?: number; jitterSec: number; now: number }): Mandate {
  const cycles = Math.min(opts.cycles ?? offer.plan.maxCycles, offer.plan.maxCycles);
  if (!Number.isInteger(cycles) || cycles < 1) throw new Error("cycles must be a positive whole number");
  return createMandate({
    network: offer.network,
    payee: { mode: "merchant", merchantKey: offer.merchantKey },
    planId: offer.plan.id,
    amountZat: offer.plan.amountZat,
    periodSec: offer.plan.periodSec,
    maxCycles: cycles,
    startAt: opts.now,
    expiresAt: opts.now + offer.plan.periodSec * cycles + offer.plan.graceSec + 1,
    graceSec: offer.plan.graceSec,
    jitterSec: Math.min(opts.jitterSec, offer.plan.graceSec, offer.plan.periodSec - 1),
  });
}

export function directMandate(p: {
  network: Network;
  address: string;
  amountZat: number;
  periodSec: number;
  cycles: number;
  graceSec: number;
  jitterSec: number;
  now: number;
}): Mandate {
  return createMandate({
    network: p.network,
    payee: { mode: "address", address: p.address },
    planId: "direct",
    amountZat: p.amountZat,
    periodSec: p.periodSec,
    maxCycles: p.cycles,
    startAt: p.now,
    expiresAt: p.now + p.periodSec * p.cycles + p.graceSec + 1,
    graceSec: p.graceSec,
    jitterSec: Math.min(p.jitterSec, p.graceSec, p.periodSec - 1),
  });
}

/** `ref` ties the mandate to the merchant's checkout page so it can show the result; it carries nothing else. */
export async function registerWithMerchant(base: string, mandate: Mandate, ref?: string): Promise<void> {
  const r = await fetch(`${base}/subscriptions${ref ? `?ref=${ref}` : ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mandate),
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (r.status !== 201) throw new Error(`merchant refused the mandate: ${await r.text()}`);
}

/** The plain-language limits a subscriber approves. */
export function describeLimits(m: Mandate, label: string): string[] {
  const total = m.amountZat * m.maxCycles;
  const payee = m.payee.mode === "merchant" ? label : "one shielded address";
  return [
    `${payee} gets at most ${formatZec(m.amountZat)} ZEC every ${duration(m.periodSec)}.`,
    `At most ${m.maxCycles} payment${m.maxCycles === 1 ? "" : "s"}, ${formatZec(total)} ZEC in total.`,
    `The mandate ends on ${new Date(m.expiresAt * 1000).toUTCString().replace(/:\d\d GMT$/, " UTC")}.`,
    `Payments are shielded only and you can revoke at any time.`,
  ];
}

export interface SubscriptionMeta {
  label: string;
  merchantUrl?: string;
  createdAt: number;
}

/** Display names and merchant URLs for mandates. Kept apart from the agent's state on purpose:
 *  nothing here can change what the agent is allowed to pay. */
export class MetaStore {
  private readonly path: string;
  private data: Record<string, SubscriptionMeta>;

  constructor(path: string, legacyMerchantsPath?: string) {
    this.path = path;
    if (existsSync(path)) {
      this.data = JSON.parse(readFileSync(path, "utf8")) as Record<string, SubscriptionMeta>;
    } else {
      this.data = {};
      if (legacyMerchantsPath && existsSync(legacyMerchantsPath)) {
        const legacy = JSON.parse(readFileSync(legacyMerchantsPath, "utf8")) as Record<string, string>;
        for (const [id, url] of Object.entries(legacy)) this.data[id] = { label: "Merchant subscription", merchantUrl: url, createdAt: 0 };
        this.save();
      }
    }
  }

  get(id: string): SubscriptionMeta | undefined {
    return this.data[id];
  }

  set(id: string, meta: SubscriptionMeta): void {
    this.data[id] = meta;
    this.save();
  }

  private save(): void {
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.path);
  }
}
