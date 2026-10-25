import type { Plan } from "./merchant.ts";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const zec = (zat: number) => (zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");

function every(sec: number): string {
  const units: Array<[number, string]> = [[86_400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [n, name] of units) if (sec % n === 0) return sec === n ? name : `${sec / n} ${name}s`;
  return `${sec} seconds`;
}

/** Public checkout page for one plan. The button opens the customer's own Cadence app with the
 *  offer filled in; the customer approves the limits there. This page never sees a key. */
export function checkoutHtml(opts: { merchantName: string; plan: Plan; offerUrl: string; appUrl: string; ref: string }): string {
  const { merchantName, plan, offerUrl, appUrl, ref } = opts;
  const openUrl = `${appUrl.replace(/\/$/, "")}/?offer=${encodeURIComponent(offerUrl)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>${esc(plan.name)} · ${esc(merchantName)}</title>
<style>
:root{--bg:#f7f5f0;--surface:#fffefb;--ink:#1d1b17;--muted:#6c675d;--line:#e4dfd3;--soft:#efebe2;--accent:#b07a12;--accent-ink:#1d1b17;--ok:#1e7a4c;--ok-bg:#e1f1e7}
@media (prefers-color-scheme:dark){:root{--bg:#13120f;--surface:#1c1a16;--ink:#efece4;--muted:#a19b8f;--line:#2f2c26;--soft:#25221d;--accent:#e6b247;--accent-ink:#1a1710;--ok:#6cc995;--ok-bg:#183424}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;padding:40px 16px}
.wrap{max-width:460px;margin:0 auto}
.merchant{font-size:13px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:26px}
h1{font-size:24px;margin:0 0 4px;letter-spacing:-.01em}
.price{display:flex;align-items:baseline;gap:8px;margin:18px 0 6px}.price strong{font-size:34px;font-variant-numeric:tabular-nums}.price span{color:var(--muted)}
.terms{color:var(--muted);margin:0 0 20px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font:inherit;font-weight:650;font-size:16px;padding:13px 16px;border-radius:12px;background:var(--accent);color:var(--accent-ink);text-decoration:none;border:0}
.btn:hover{filter:brightness(1.05)}.btn:focus-visible,.copy:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.z{width:20px;height:20px;border-radius:50%;background:var(--accent-ink);color:var(--accent);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
.alt{margin-top:16px;font-size:13px;color:var(--muted)}
.linkrow{display:flex;gap:6px;margin-top:6px}
.linkrow input{flex:1;min-width:0;font:12px ui-monospace,Menlo,monospace;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink)}
.copy{font:inherit;font-size:13px;font-weight:550;padding:7px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.status{margin-top:20px;padding:12px 14px;border-radius:12px;background:var(--soft);font-size:14px;display:flex;gap:10px;align-items:center}
.status.ok{background:var(--ok-bg);color:var(--ok)}
.spin{width:12px;height:12px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:s 1s linear infinite;flex:none}
.status.ok .spin{display:none}
@keyframes s{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.how{margin:22px 0 0;padding:0;list-style:none;display:grid;gap:10px;font-size:14px}
.how li{display:grid;grid-template-columns:24px 1fr;gap:8px}.how b{color:var(--accent)}
.fine{font-size:12.5px;color:var(--muted);margin-top:18px;text-align:center}
</style></head><body><main class="wrap">
<div class="merchant">${esc(merchantName)}</div>
<div class="card" id="checkout" data-ref="${esc(ref)}">
  <h1>${esc(plan.name)}</h1>
  <div class="price"><strong>${zec(plan.amountZat)} ZEC</strong><span>every ${esc(every(plan.periodSec))}</span></div>
  <p class="terms">Up to ${plan.maxCycles} payments. Cancel any time from your own app.</p>
  <a class="btn" id="open" href="${esc(openUrl)}" target="_blank" rel="noopener noreferrer"><span class="z">ⓩ</span>Subscribe with Zcash</a>
  <div class="alt">Cadence not on this computer? Paste this link into your Cadence app:
    <div class="linkrow"><input id="offer" readonly value="${esc(offerUrl)}" aria-label="Subscription link"><button class="copy" id="copy" type="button">Copy</button></div>
  </div>
  <div class="status" id="status" role="status" aria-live="polite"><span class="spin" aria-hidden="true"></span><span id="status-text">Waiting for you to approve in Cadence…</span></div>
  <ol class="how">
    <li><b>1</b><span>Cadence shows you the exact limits: amount, how often, how many times.</span></li>
    <li><b>2</b><span>You approve. Your keys never leave your computer and we get no permission to spend.</span></li>
    <li><b>3</b><span>Each period your Cadence pays a fresh shielded address. Nobody else can see who paid or how much.</span></li>
  </ol>
</div>
<p class="fine">Payments are shielded Zcash. ${esc(merchantName)} sees that your subscription is paid, nothing more.</p>
</main><script src="/checkout.js"></script></body></html>`;
}

export const CHECKOUT_JS = `"use strict";
(() => {
  const ref = document.getElementById("checkout").dataset.ref;
  const text = document.getElementById("status-text");
  const box = document.getElementById("status");
  document.getElementById("copy").addEventListener("click", async (e) => {
    const input = document.getElementById("offer");
    try { await navigator.clipboard.writeText(input.value); e.target.textContent = "Copied"; }
    catch { input.select(); }
  });
  let done = false;
  async function poll() {
    if (done) return;
    try {
      const r = await fetch("/checkout/status?ref=" + encodeURIComponent(ref));
      const s = await r.json();
      if (s.state === "subscribed") {
        box.classList.add("ok");
        if (s.cyclesPaid > 0) { text.textContent = "Subscribed. First payment received. You're all set."; done = true; }
        else text.textContent = "Subscribed. Waiting for the first payment…";
      }
    } catch {}
  }
  poll();
  setInterval(poll, 3000);
})();
`;
