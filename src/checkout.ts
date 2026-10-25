import type { Plan } from "./merchant.ts";
import { ICONS, LOGO_SVG, THEME_CSS } from "./ui/theme.ts";

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
  const total = plan.amountZat * plan.maxCycles;
  const features = (plan.features ?? []).slice(0, 6);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>${esc(plan.name)} · ${esc(merchantName)}</title>
<style>${THEME_CSS}
.shop{max-width:1040px;margin:0 auto;padding:22px 28px;display:flex;align-items:center;justify-content:space-between}
.shop-name{display:flex;align-items:center;gap:10px;font-weight:650;font-size:16px}
.shop-name .avatar{width:34px;height:34px;border-radius:10px;font-size:15px}
.secure{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)}.secure .ico{width:15px;height:15px;color:var(--ok)}
.wrap{max-width:1040px;margin:0 auto;padding:12px 28px 72px;display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:start}
@media (max-width:880px){.wrap{grid-template-columns:1fr;gap:24px;padding:8px 16px 56px}.shop{padding:18px 16px}}
.plan h1{font-size:34px;letter-spacing:-.03em;line-height:1.15;margin-top:8px}
.plan .desc{font-size:16.5px;color:var(--ink-2);margin-top:12px;max-width:46ch}
.feats{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:12px}
.feats li{display:flex;gap:10px;align-items:flex-start;font-size:15px}.feats .ico{color:var(--gold);margin-top:2px}
.terms{margin-top:28px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.term{padding:14px 16px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.term strong{display:block;font-size:17px;letter-spacing:-.01em}.term span{font-size:12.5px;color:var(--muted)}
.pay{position:sticky;top:24px;background:linear-gradient(180deg,#0d1f4b,#06122c);border-color:var(--line-2)}
.priv{margin-top:34px;padding-top:28px;border-top:1px solid var(--line);display:grid;gap:18px}
.priv-row{display:grid;grid-template-columns:40px 1fr;gap:14px;align-items:start}
.priv-row .pi{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--gold-soft);color:var(--gold);border:1px solid rgba(127,180,255,.22)}
.priv-row strong{display:block;font-size:15px;margin-bottom:2px}.priv-row span{color:var(--muted);font-size:14px}
.pay-head{padding:24px 26px 0}
.price{display:flex;align-items:baseline;gap:8px;margin-top:6px}.price strong{font-size:44px;letter-spacing:-.035em;line-height:1}
.price span{color:var(--muted);font-size:15px}
.pay-body{padding:20px 26px 26px}
.cta .ico{width:20px;height:20px}
.or{display:flex;align-items:center;gap:10px;color:var(--faint);font-size:12px;margin:18px 0 10px;text-transform:uppercase;letter-spacing:.08em}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
.linkrow{display:flex;gap:8px}.linkrow .input{font-family:var(--mono);font-size:12px;padding:9px 10px}
.status{margin-top:18px;padding:13px 15px;border-radius:12px;background:var(--soft);font-size:14px;display:flex;gap:11px;align-items:center;color:var(--ink-2)}
.status.ok{background:var(--ok-soft);color:var(--ok)}.status .ico{width:18px;height:18px}
.spin{width:14px;height:14px;border-radius:50%;border:2px solid var(--line-2);border-top-color:var(--gold);animation:s 1s linear infinite;flex:none}
@keyframes s{to{transform:rotate(360deg)}}
.steps{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:14px;counter-reset:st}
.steps li{display:grid;grid-template-columns:26px 1fr;gap:10px;font-size:13.5px;color:var(--ink-2);counter-increment:st}
.steps li::before{content:counter(st);width:22px;height:22px;border-radius:50%;background:var(--gold-soft);color:var(--gold-ink);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
.steps b{color:var(--ink)}
.foot{border-top:1px solid var(--line);padding:14px 26px;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.foot svg{width:16px;height:16px;color:var(--ink)}
</style></head><body>
<header class="shop">
  <div class="shop-name"><span class="avatar">${esc(merchantName.trim().charAt(0).toUpperCase() || "M")}</span>${esc(merchantName)}</div>
  <span class="secure">${ICONS.shield} Private checkout</span>
</header>
<main class="wrap">
  <section class="plan">
    <span class="eyebrow">Subscription</span>
    <h1>${esc(plan.name)}</h1>
    ${plan.description ? `<p class="desc">${esc(plan.description)}</p>` : ""}
    ${features.length ? `<ul class="feats">${features.map((f) => `<li>${ICONS.check}<span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
    <div class="terms">
      <div class="term"><strong class="num">${zec(plan.amountZat)} ZEC</strong><span>per payment</span></div>
      <div class="term"><strong>${esc(every(plan.periodSec))}</strong><span>between payments</span></div>
      <div class="term"><strong class="num">${plan.maxCycles}×</strong><span>at most, ${zec(total)} ZEC total</span></div>
    </div>
    <div class="priv">
      <div class="priv-row"><span class="pi">${ICONS.eyeOff}</span><div><strong>Nobody else sees this purchase</strong><span>Payments are shielded Zcash. The chain shows neither you, us, nor the amount.</span></div></div>
      <div class="priv-row"><span class="pi">${ICONS.key}</span><div><strong>We can't over-charge you</strong><span>You approve a hard limit in your own app. We never hold a key that can spend.</span></div></div>
      <div class="priv-row"><span class="pi">${ICONS.repeat}</span><div><strong>Cancel in one click</strong><span>Revoke in Cadence and the next payment simply never happens.</span></div></div>
    </div>
  </section>

  <section class="card pay" id="checkout" data-ref="${esc(ref)}" aria-label="Pay with Zcash">
    <div class="pay-head">
      <span class="eyebrow">You pay</span>
      <div class="price"><strong class="num">${zec(plan.amountZat)}</strong><span>ZEC every ${esc(every(plan.periodSec))}</span></div>
    </div>
    <div class="pay-body">
      <a class="btn gold lg block cta" id="open" href="${esc(openUrl)}" target="_blank" rel="noopener noreferrer">${ICONS.zec} Subscribe with Zcash</a>
      <div class="or">or paste in Cadence</div>
      <div class="linkrow"><input class="input" id="offer" readonly value="${esc(offerUrl)}" aria-label="Subscription link"><button class="btn" id="copy" type="button">Copy</button></div>
      <div class="status" id="status" role="status" aria-live="polite"><span class="spin" aria-hidden="true"></span><span id="status-text">Waiting for you to approve in Cadence…</span></div>
      <ol class="steps">
        <li><span><b>Review the limits.</b> Cadence shows exactly what ${esc(merchantName)} may take, and how often.</span></li>
        <li><span><b>Approve.</b> Your keys stay on your computer. We never get permission to spend.</span></li>
        <li><span><b>Paid privately.</b> Each payment goes to a fresh shielded address. Nobody else can see it.</span></li>
      </ol>
    </div>
    <div class="foot">${LOGO_SVG}<span>Autopay by Cadence · shielded Zcash. Cancel any time from your app.</span></div>
  </section>
</main>
<script src="/checkout.js"></script></body></html>`;
}

export const CHECKOUT_JS = `"use strict";
(() => {
  const ref = document.getElementById("checkout").dataset.ref;
  const text = document.getElementById("status-text");
  const box = document.getElementById("status");
  const CHECK = ${JSON.stringify(ICONS.check)};
  document.getElementById("copy").addEventListener("click", async (e) => {
    const input = document.getElementById("offer");
    try { await navigator.clipboard.writeText(input.value); e.target.textContent = "Copied"; }
    catch { input.select(); }
  });
  let done = false;
  function ok(msg) {
    box.classList.add("ok");
    const spin = box.querySelector(".spin");
    if (spin) { spin.insertAdjacentHTML("beforebegin", CHECK); spin.remove(); }
    text.textContent = msg;
  }
  async function poll() {
    if (done) return;
    try {
      const r = await fetch("/checkout/status?ref=" + encodeURIComponent(ref));
      const s = await r.json();
      if (s.state === "subscribed") {
        if (s.cyclesPaid > 0) { ok("You're subscribed. First payment received."); done = true; }
        else ok("Approved. Waiting for the first payment…");
      }
    } catch {}
  }
  poll();
  setInterval(poll, 3000);
})();
`;
