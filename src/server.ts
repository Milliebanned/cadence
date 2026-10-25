import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { randomBytes } from "node:crypto";
import type { Merchant } from "./merchant.ts";
import { CHECKOUT_JS, checkoutHtml } from "./checkout.ts";
import { ADMIN_HTML, ADMIN_JS } from "./admin-assets.ts";
import type { EventLog } from "./events.ts";
import type { Mandate } from "./types.ts";

const MAX_BODY = 16 * 1024;

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, "body too large");
    chunks.push(c as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown, type = "application/json"): void {
  const text = type === "application/json" ? JSON.stringify(body) : String(body);
  res.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  res.end(text);
}

function adminOk(req: IncomingMessage, token: string): boolean {
  const given = Buffer.from(String(req.headers.authorization ?? "").replace(/^Bearer /, ""));
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Public routes: offer, register a mandate, fetch an invoice. Dashboard and cancel need the admin token. */
export interface MerchantServerOptions {
  adminToken: string;
  now?: () => number;
  /** this server's public base URL, used to build offer links on checkout pages */
  publicUrl?: string;
  /** where the customer's Cadence app listens; the checkout button opens it */
  appUrl?: string;
  merchantName?: string;
  events?: EventLog;
  webhookConfigured?: boolean;
  health?: () => { lastSyncAt: number | null; lastSyncError: string | null };
}

function every(sec: number): string {
  const units: Array<[number, string]> = [[86_400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [n, name] of units) if (sec % n === 0) return sec === n ? name : `${sec / n} ${name}s`;
  return `${sec}s`;
}

export function merchantServer(merchant: Merchant, opts: MerchantServerOptions): Server {
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  const appUrl = opts.appUrl ?? "http://127.0.0.1:8790";
  const merchantName = opts.merchantName ?? "Merchant";
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://local");
      const parts = url.pathname.split("/").filter(Boolean);

      if (req.method === "GET" && parts[0] === "offer" && parts.length === 2) {
        return send(res, 200, merchant.offer(parts[1]!));
      }
      if (req.method === "GET" && parts[0] === "checkout" && parts.length === 2 && parts[1] !== "status") {
        const plan = merchant.plans.get(parts[1]!);
        if (!plan) throw new HttpError(404, "unknown plan");
        const base = (opts.publicUrl ?? `http://${req.headers.host}`).replace(/\/$/, "");
        const ref = randomBytes(16).toString("hex");
        const offerUrl = `${base}/offer/${encodeURIComponent(plan.id)}?ref=${ref}`;
        return send(res, 200, checkoutHtml({ merchantName, plan, offerUrl, appUrl, ref }), "text/html");
      }
      if (req.method === "GET" && url.pathname === "/checkout.js") return send(res, 200, CHECKOUT_JS, "text/javascript");
      if (req.method === "GET" && url.pathname === "/checkout/status") {
        const ref = url.searchParams.get("ref") ?? "";
        if (!/^[0-9a-f]{32}$/.test(ref)) throw new HttpError(400, "bad reference");
        return send(res, 200, merchant.checkoutState(ref, now()));
      }
      if (req.method === "POST" && parts[0] === "subscriptions" && parts.length === 1) {
        const mandate = (await readJson(req)) as Mandate;
        const ref = url.searchParams.get("ref") ?? undefined;
        if (ref !== undefined && !/^[0-9a-f]{32}$/.test(ref)) throw new HttpError(400, "bad reference");
        try {
          merchant.register(mandate, now(), ref);
        } catch (e) {
          throw new HttpError(422, (e as Error).message);
        }
        return send(res, 201, { mandateId: mandate.id });
      }
      if (req.method === "GET" && parts[0] === "invoices" && parts.length === 3) {
        try {
          return send(res, 200, await merchant.invoice(parts[1]!, Number(parts[2]), now()));
        } catch (e) {
          const msg = (e as Error).message;
          // Rule violations are final; anything else (wallet busy, sync error) is worth retrying.
          const final = /unknown subscription|cancelled|no such cycle|not due yet/.test(msg);
          throw new HttpError(final ? 404 : 503, final ? msg : `invoice temporarily unavailable: ${msg.split("\n")[0]}`);
        }
      }

      // The dashboard page and script hold no data; everything under /admin/api needs the admin token.
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/admin")) return send(res, 200, ADMIN_HTML, "text/html");
      if (req.method === "GET" && url.pathname === "/admin.js") return send(res, 200, ADMIN_JS, "text/javascript");

      if (!adminOk(req, opts.adminToken)) throw new HttpError(url.pathname.startsWith("/admin/api/") ? 401 : 404, url.pathname.startsWith("/admin/api/") ? "admin token required" : "not found");
      if (req.method === "GET" && url.pathname === "/admin/api/overview") {
        const o = merchant.overview(now());
        return send(res, 200, {
          ...o,
          now: now(),
          merchantName,
          plans: o.plans.map((p) => ({ ...p, every: every(p.periodSec) })),
          events: opts.events?.list(50) ?? [],
          webhookConfigured: opts.webhookConfigured ?? false,
          health: opts.health?.() ?? null,
        });
      }
      if (req.method === "POST" && url.pathname === "/admin/api/cancel") {
        const body = (await readJson(req)) as { mandateId?: string };
        try {
          merchant.cancel(String(body.mandateId ?? ""), now());
        } catch (e) {
          throw new HttpError(404, (e as Error).message);
        }
        return send(res, 200, merchant.status(String(body.mandateId), now()));
      }
      throw new HttpError(404, "not found");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      send(res, status, { error: status === 500 ? "internal error" : (e as Error).message });
    }
  });
}
