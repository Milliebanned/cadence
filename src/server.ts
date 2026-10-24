import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { Merchant } from "./merchant.ts";
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
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
  });
  res.end(text);
}

function adminOk(req: IncomingMessage, token: string): boolean {
  const given = Buffer.from(String(req.headers.authorization ?? "").replace(/^Bearer /, ""));
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const ZEC = (zat: number) => (zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");

export function dashboardHtml(merchant: Merchant, now: number): string {
  const rows = merchant
    .subscriptions()
    .map((s) => {
      const st = merchant.status(s.mandate.id, now);
      const plan = merchant.plans.get(s.mandate.planId);
      const due = st.nextDueAt ? new Date(st.nextDueAt * 1000).toISOString().slice(0, 16).replace("T", " ") : "—";
      return `<tr><td><code>${esc(s.mandate.id.slice(0, 12))}</code></td><td>${esc(plan?.name ?? s.mandate.planId)}</td>
<td>${ZEC(s.mandate.amountZat)} ZEC</td><td>${st.cyclesPaid} / ${s.mandate.maxCycles}</td><td>${due}</td><td class="${st.status}">${st.status}</td></tr>`;
    })
    .join("\n");
  const revenue = merchant
    .subscriptions()
    .flatMap((s) => Object.values(s.invoices))
    .reduce((sum, i) => sum + (i.paid?.valueZat ?? 0), 0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cadence merchant</title>
<style>
:root{--bg:#fbfaf7;--fg:#1c1b19;--muted:#6b675f;--line:#e6e2d9;--ok:#1f7a4d;--warn:#a66300;--bad:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#9c978d;--line:#2d2b27;--ok:#5cc28f;--warn:#e0a24a;--bad:#ef6b62}}
body{background:var(--bg);color:var(--fg);font:15px/1.5 ui-sans-serif,system-ui,sans-serif;margin:0;padding:24px 16px;max-width:960px;margin:auto}
h1{font-size:20px;margin:0 0 4px}p{color:var(--muted);margin:0 0 20px}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-weight:500;font-size:13px}.active,.complete{color:var(--ok)}.late{color:var(--warn)}.lapsed,.cancelled{color:var(--bad)}
.k{display:flex;gap:24px;margin:0 0 20px}.k div{font-size:13px;color:var(--muted)}.k b{display:block;font-size:20px;color:var(--fg)}
</style></head><body>
<h1>Cadence · merchant</h1>
<p>Payments are read with a viewing key. This server cannot spend.</p>
<div class="k"><div><b>${merchant.subscriptions().length}</b>subscriptions</div><div><b>${ZEC(revenue)} ZEC</b>received</div><div><b>${esc(merchant.network)}</b>network</div></div>
<table><thead><tr><th>Mandate</th><th>Plan</th><th>Amount</th><th>Cycles paid</th><th>Next due (UTC)</th><th>Status</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">No subscriptions yet.</td></tr>'}</tbody></table>
</body></html>`;
}

/** Public routes: offer, register a mandate, fetch an invoice. Dashboard and cancel need the admin token. */
export function merchantServer(merchant: Merchant, opts: { adminToken: string; now?: () => number }): Server {
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://local");
      const parts = url.pathname.split("/").filter(Boolean);

      if (req.method === "GET" && parts[0] === "offer" && parts.length === 2) {
        return send(res, 200, merchant.offer(parts[1]!));
      }
      if (req.method === "POST" && parts[0] === "subscriptions" && parts.length === 1) {
        const mandate = (await readJson(req)) as Mandate;
        try {
          merchant.register(mandate, now());
        } catch (e) {
          throw new HttpError(422, (e as Error).message);
        }
        return send(res, 201, { mandateId: mandate.id });
      }
      if (req.method === "GET" && parts[0] === "invoices" && parts.length === 3) {
        try {
          return send(res, 200, await merchant.invoice(parts[1]!, Number(parts[2]), now()));
        } catch (e) {
          throw new HttpError(404, (e as Error).message);
        }
      }

      if (!adminOk(req, opts.adminToken)) {
        if (req.method === "GET" && parts.length === 0) {
          res.writeHead(401, { "www-authenticate": "Bearer" });
          return res.end("admin token required");
        }
        throw new HttpError(404, "not found");
      }
      if (req.method === "GET" && parts.length === 0) return send(res, 200, dashboardHtml(merchant, now()), "text/html");
      if (req.method === "POST" && parts[0] === "subscriptions" && parts[2] === "cancel" && parts.length === 3) {
        merchant.cancel(parts[1]!, now());
        return send(res, 200, merchant.status(parts[1]!, now()));
      }
      throw new HttpError(404, "not found");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      send(res, status, { error: status === 500 ? "internal error" : (e as Error).message });
    }
  });
}
