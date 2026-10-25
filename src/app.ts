import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { PENDING_RECOVERY_SEC, type Agent, type TickResult } from "./agent.ts";
import { AuditLog } from "./audit.ts";
import type { Balance } from "./devtool.ts";
import { dueAtForCycle } from "./mandate.ts";
import {
  describeLimits,
  directMandate,
  duration,
  fetchOffer,
  formatZec,
  mandateFromOffer,
  registerWithMerchant,
  zecToZat,
  type MetaStore,
} from "./subscribe.ts";
import type { Mandate, Network } from "./types.ts";
import { APP_CSS, APP_HTML, APP_JS } from "./app-assets.ts";

const DAY = 86_400;
const PREVIEW_TTL_SEC = 600;
const STUCK_SEC = PENDING_RECOVERY_SEC + 60;

interface Preview {
  mandate: Mandate;
  label: string;
  merchantUrl?: string;
  ref?: string;
  createdAt: number;
}

export interface AppOptions {
  agent: Agent;
  meta: MetaStore;
  auditPath: string;
  network: Network;
  port: number;
  token: string;
  balance?: () => Promise<Balance>;
  tickEverySec?: number;
  now?: () => number;
  jitterSec?: number;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SECURITY_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function send(res: ServerResponse, status: number, body: string, type: string): void {
  res.writeHead(status, { ...SECURITY_HEADERS, "content-type": `${type}; charset=utf-8` });
  res.end(body);
}

const json = (res: ServerResponse, status: number, body: unknown) => send(res, status, JSON.stringify(body), "application/json");

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 16 * 1024) throw new HttpError(413, "body too large");
    chunks.push(c as Buffer);
  }
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}

function tokenOk(given: string | undefined, want: string): boolean {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The subscriber's local app: one process runs the agent and serves the UI on 127.0.0.1 only.
 *  Every API call needs the per-launch token, and Host/Origin must be this app, so a web page
 *  in another tab cannot reach it (no CSRF, no DNS rebinding). */
export function subscriberApp(opts: AppOptions): { server: Server; stop: () => void } {
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  const previews = new Map<string, Preview>();
  const lastTick = new Map<string, TickResult & { at: number }>();
  let balance: (Balance & { at: number }) | null = null;
  let balanceError: string | null = null;
  let ticking = false;

  const allowedHosts = new Set([`127.0.0.1:${opts.port}`, `localhost:${opts.port}`]);

  const refreshBalance = async () => {
    if (!opts.balance) return;
    try {
      balance = { ...(await opts.balance()), at: now() };
      balanceError = null;
    } catch (e) {
      balanceError = (e as Error).message.split("\n")[0]!;
    }
  };

  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      for (const r of await opts.agent.tick(now())) lastTick.set(r.mandateId, { ...r, at: now() });
      if (opts.balance && (!balance || now() - balance.at > 30)) await refreshBalance();
    } catch (e) {
      balanceError = (e as Error).message.split("\n")[0]!;
    } finally {
      ticking = false;
    }
  };

  function viewOf(id: string) {
    const m = opts.agent.mandate(id);
    const s = opts.agent.stateOf(id);
    const meta = opts.meta.get(id);
    const t = now();
    const nextCycle = s.cyclesPaid + 1;
    const done = s.cyclesPaid >= m.maxCycles;
    const expired = t >= m.expiresAt;
    const last = lastTick.get(id);
    let status: string;
    if (s.revoked) status = "revoked";
    else if (done) status = "complete";
    else if (expired) status = "expired";
    // A send in flight is normal for a few seconds; only a send stuck past automatic recovery needs a person.
    else if (s.pending && t - s.pending.startedAt > STUCK_SEC) status = "attention";
    else if (last && (last.action === "refused" || last.action === "failed")) status = "attention";
    else status = "active";
    return {
      id,
      label: meta?.label ?? (m.payee.mode === "address" ? "Autopay" : "Subscription"),
      mode: m.payee.mode,
      payee: m.payee.mode === "address" ? m.payee.address : meta?.merchantUrl ?? "",
      amount: formatZec(m.amountZat),
      every: duration(m.periodSec),
      cyclesPaid: s.cyclesPaid,
      maxCycles: m.maxCycles,
      paid: formatZec(s.totalPaidZat),
      cap: formatZec(m.amountZat * m.maxCycles),
      capUsedPct: Math.round((s.totalPaidZat / (m.amountZat * m.maxCycles)) * 100),
      nextDueAt: done || s.revoked ? null : dueAtForCycle(m, nextCycle),
      nextSendAt: done || s.revoked ? null : s.sendAt[String(nextCycle)] ?? null,
      expiresAt: m.expiresAt,
      status,
      pending: s.pending && t - s.pending.startedAt > STUCK_SEC ? s.pending : null,
      sending: s.pending ? s.pending.cycle : null,
      confirming: s.unconfirmed?.cycle ?? null,
      lastResult: last
        ? {
            action: last.action,
            at: last.at,
            detail:
              last.action === "refused" ? last.reasons.join("; ") : last.action === "failed" ? last.error : last.action === "blocked" ? last.reason : "",
          }
        : null,
      limits: describeLimits(m, meta?.label ?? "The merchant"),
    };
  }

  function activity() {
    const labels = new Map(opts.agent.mandateIds().map((id) => [id, opts.meta.get(id)?.label ?? "Autopay"]));
    return AuditLog.read(opts.auditPath)
      .slice(-200)
      .reverse()
      .map((e) => {
        const d = e.detail as Record<string, unknown>;
        const id = String(d.mandateId ?? "");
        return {
          seq: e.seq,
          at: e.at,
          event: e.event,
          mandateId: id,
          label: labels.get(id) ?? id.slice(0, 8),
          cycle: d.cycle ?? null,
          txid: d.txid ?? null,
          detail: Array.isArray(d.reasons) ? (d.reasons as string[]).join("; ") : typeof d.error === "string" ? d.error.split("\n")[0] : "",
        };
      });
  }

  function stash(p: Omit<Preview, "createdAt">) {
    const t = now();
    for (const [k, v] of previews) if (t - v.createdAt > PREVIEW_TTL_SEC) previews.delete(k);
    const previewId = randomBytes(16).toString("hex");
    previews.set(previewId, { ...p, createdAt: t });
    return {
      previewId,
      label: p.label,
      mode: p.mandate.payee.mode,
      payee: p.mandate.payee.mode === "address" ? p.mandate.payee.address : p.merchantUrl,
      amount: formatZec(p.mandate.amountZat),
      every: duration(p.mandate.periodSec),
      maxCycles: p.mandate.maxCycles,
      cap: formatZec(p.mandate.amountZat * p.mandate.maxCycles),
      limits: describeLimits(p.mandate, p.label),
      mandateId: p.mandate.id,
    };
  }

  const server = createServer(async (req, res) => {
    try {
      if (!allowedHosts.has(String(req.headers.host ?? ""))) throw new HttpError(421, "wrong host");
      const origin = req.headers.origin;
      if (origin && !allowedHosts.has(origin.replace(/^http:\/\//, ""))) throw new HttpError(403, "cross-origin request refused");
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/") return send(res, 200, APP_HTML, "text/html");
      if (req.method === "GET" && url.pathname === "/app.js") return send(res, 200, APP_JS, "text/javascript");
      if (req.method === "GET" && url.pathname === "/app.css") return send(res, 200, APP_CSS, "text/css");
      if (!url.pathname.startsWith("/api/")) throw new HttpError(404, "not found");
      if (!tokenOk(req.headers["x-cadence-token"] as string | undefined, opts.token)) throw new HttpError(401, "missing or wrong app token");

      if (req.method === "GET" && url.pathname === "/api/state") {
        return json(res, 200, {
          network: opts.network,
          now: now(),
          balance: balance
            ? { shielded: formatZec(balance.shieldedSpendableZat), transparent: formatZec(balance.transparentSpendableZat), at: balance.at }
            : null,
          balanceError,
          subscriptions: opts.agent.mandateIds().map(viewOf).reverse(),
          activity: activity(),
        });
      }

      if (req.method === "POST" && url.pathname === "/api/preview/offer") {
        const body = await readJson(req);
        const cycles = body.cycles === undefined || body.cycles === "" ? undefined : Number(body.cycles);
        let fetched;
        try {
          fetched = await fetchOffer(String(body.offerUrl ?? ""));
        } catch (e) {
          throw new HttpError(422, (e as Error).message);
        }
        const { offer, base, ref } = fetched;
        if (offer.network !== opts.network) throw new HttpError(422, `this offer is for ${offer.network}, the app runs on ${opts.network}`);
        const mandate = mandateFromOffer(offer, { cycles, jitterSec: opts.jitterSec ?? 3600, now: now() });
        return json(res, 200, stash({ mandate, label: offer.plan.name, merchantUrl: base, ref }));
      }

      if (req.method === "POST" && url.pathname === "/api/preview/direct") {
        const body = await readJson(req);
        const everyDays = Number(body.everyDays);
        const cycles = Number(body.cycles);
        if (!(everyDays > 0)) throw new HttpError(422, "choose how often to pay");
        if (!Number.isInteger(cycles) || cycles < 1 || cycles > 1000) throw new HttpError(422, "number of payments must be 1 to 1000");
        let mandate: Mandate;
        try {
          const periodSec = Math.max(60, Math.round(everyDays * DAY));
          mandate = directMandate({
            network: opts.network,
            address: String(body.address ?? "").trim(),
            amountZat: zecToZat(String(body.amount ?? "").trim()),
            periodSec,
            cycles,
            graceSec: Math.min(3 * DAY, periodSec - 1),
            jitterSec: opts.jitterSec ?? 3600,
            now: now(),
          });
        } catch (e) {
          throw new HttpError(422, (e as Error).message);
        }
        const label = String(body.label ?? "").trim().slice(0, 60) || "Autopay";
        return json(res, 200, stash({ mandate, label }));
      }

      if (req.method === "POST" && url.pathname === "/api/approve") {
        const body = await readJson(req);
        const p = previews.get(String(body.previewId ?? ""));
        if (!p || now() - p.createdAt > PREVIEW_TTL_SEC) throw new HttpError(410, "this approval expired, preview it again");
        previews.delete(String(body.previewId));
        if (p.merchantUrl) {
          try {
            await registerWithMerchant(p.merchantUrl, p.mandate, p.ref);
          } catch (e) {
            throw new HttpError(502, (e as Error).message);
          }
        }
        opts.agent.subscribe(p.mandate, now());
        opts.meta.set(p.mandate.id, { label: p.label, merchantUrl: p.merchantUrl, createdAt: now() });
        void tick();
        return json(res, 201, { mandateId: p.mandate.id });
      }

      if (req.method === "POST" && url.pathname === "/api/revoke") {
        const body = await readJson(req);
        const id = String(body.mandateId ?? "");
        if (!opts.agent.mandateIds().includes(id)) throw new HttpError(404, "unknown subscription");
        opts.agent.revoke(id, now());
        return json(res, 200, viewOf(id));
      }

      if (req.method === "POST" && url.pathname === "/api/resolve") {
        const body = await readJson(req);
        const id = String(body.mandateId ?? "");
        if (body.outcome !== "paid" && body.outcome !== "not-paid") throw new HttpError(422, "outcome must be paid or not-paid");
        try {
          opts.agent.resolvePending(id, body.outcome, now());
        } catch (e) {
          throw new HttpError(409, (e as Error).message);
        }
        return json(res, 200, viewOf(id));
      }

      throw new HttpError(404, "not found");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      json(res, status, { error: status === 500 ? "internal error" : (e as Error).message });
      if (status === 500) console.error(e);
    }
  });

  const interval = setInterval(() => void tick(), (opts.tickEverySec ?? 15) * 1000);
  void tick();
  return {
    server,
    stop: () => {
      clearInterval(interval);
      server.close();
    },
  };
}

export function newAppToken(): string {
  return randomBytes(24).toString("base64url");
}
