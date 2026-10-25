import { ICONS, LOGO_SVG, THEME_CSS } from "./ui/theme.ts";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface HubLinks {
  appUrl: string;
  adminUrl: string;
  checkoutUrls: Array<{ name: string; url: string }>;
  proofCommand: string;
}

/** The demo's front page: what Cadence is, and one link per role. */
export function hubHtml(l: HubLinks): string {
  const link = (url: string, label: string, cls = "btn primary") =>
    `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${ICONS.arrow}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Cadence · Private autopay for Zcash</title>
<style>${THEME_CSS}
.hero{background:var(--band);color:var(--band-ink);padding:64px 0 72px;border-bottom:1px solid var(--band-line)}
.hero-in{max-width:1080px;margin:0 auto;padding:0 28px}
.hero .eyebrow{color:var(--gold)}
.hero h1{color:var(--band-ink);font-size:clamp(34px,5.4vw,58px);line-height:1.04;letter-spacing:-.04em;margin:14px 0 18px;max-width:15ch}
.hero h1 em{font-style:normal;color:var(--gold)}
.hero p.lead{font-size:18px;line-height:1.6;color:var(--band-muted);max-width:62ch}
.hero-pills{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}
.hero-pills span{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;padding:7px 13px;border-radius:999px;border:1px solid var(--band-line);color:var(--band-ink);background:rgba(255,255,255,.04)}
.hero-pills .ico{width:16px;height:16px;color:var(--gold)}
.main{max-width:1080px;margin:-36px auto 0;padding:0 28px 80px}
@media (max-width:760px){.hero-in,.main{padding-left:16px;padding-right:16px}.hero{padding:44px 0 64px}}
.roles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media (max-width:900px){.roles{grid-template-columns:1fr}}
.role{padding:24px;display:flex;flex-direction:column;gap:12px}
.role-top{display:flex;align-items:center;justify-content:space-between}
.step-n{font-size:12px;font-weight:700;color:var(--gold-ink);background:var(--gold-soft);border-radius:999px;padding:3px 10px}
.role .ico-big{width:42px;height:42px;border-radius:12px;background:var(--soft);display:flex;align-items:center;justify-content:center;color:var(--ink)}
.role h2{font-size:19px}.role p{color:var(--ink-2);font-size:14.5px}
.role .actions{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;padding-top:6px}
.section{margin-top:44px}
.section h2.big{font-size:24px;margin-bottom:6px}
.section .sub{color:var(--muted);margin-bottom:18px}
.two{display:grid;grid-template-columns:1.2fr 1fr;gap:16px}
@media (max-width:900px){.two{grid-template-columns:1fr}}
.try{list-style:none;padding:0;margin:0;display:grid;gap:14px;counter-reset:t}
.try li{display:grid;grid-template-columns:30px 1fr;gap:12px;counter-increment:t;font-size:15px;color:var(--ink-2)}
.try li::before{content:counter(t);width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--paper);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.try b{color:var(--ink)}
.seen{display:grid;gap:10px;font-size:14px}
.seen-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:var(--soft)}
.seen-row span:last-child{font-weight:600}
.seen-row.hide span:last-child{color:var(--ok)}
pre{margin:14px 0 0;padding:14px 16px;border-radius:12px;background:var(--band);color:#e9e4d8;font:12.5px/1.6 var(--mono);white-space:pre-wrap;word-break:break-all}
.running{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
@media (max-width:1000px){.running{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:560px){.running{grid-template-columns:1fr}}
.run{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);font-size:13.5px}
.live{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px var(--ok-soft);flex:none}
footer{max-width:1080px;margin:0 auto;padding:0 28px 40px;color:var(--faint);font-size:12.5px}
</style></head><body>
<header class="band"><div class="band-inner">
  <div class="logo">${LOGO_SVG}Cadence<small>· live demo</small></div>
  <div style="display:flex;gap:8px"><span class="chip ok"><span class="live" style="box-shadow:none;width:7px;height:7px"></span>Private chain running</span><span class="chip" id="height">block …</span></div>
</div></header>

<section class="hero"><div class="hero-in">
  <span class="eyebrow">Shielded payments · Zcash</span>
  <h1>Subscriptions that pay themselves, <em>privately.</em></h1>
  <p class="lead">Zcash can't pull a payment from your wallet, so every subscription today means remembering to pay. Cadence lets you approve a subscription once, with hard limits, then pays each period for you, fully shielded. Merchants get paid without ever holding a key that can spend.</p>
  <div class="hero-pills">
    <span>${ICONS.shield}Shielded to shielded, nothing public but the fee</span>
    <span>${ICONS.key}Limits you sign, enforced on your side</span>
    <span>${ICONS.eyeOff}Merchant runs on a viewing key only</span>
  </div>
</div></section>

<main class="main">
  <div class="roles">
    <article class="card role">
      <div class="role-top"><span class="ico-big">${ICONS.repeat}</span><span class="step-n">Open first</span></div>
      <h2>Your Cadence app</h2>
      <p>The subscriber's side. Review limits, approve, watch payments go out, revoke any time. Open it first: the checkout button hands off to it.</p>
      <div class="actions">${link(l.appUrl, "Open Cadence")}</div>
    </article>
    <article class="card role">
      <div class="role-top"><span class="ico-big">${ICONS.store}</span><span class="step-n">Then</span></div>
      <h2>A merchant's checkout</h2>
      <p>What a customer sees on a shop's site. Click <b>Subscribe with Zcash</b>; the page updates live when you approve and when the first payment lands.</p>
      <div class="actions">${l.checkoutUrls.map((c, i) => link(c.url, c.name, i === 0 ? "btn primary" : "btn")).join("")}</div>
    </article>
    <article class="card role">
      <div class="role-top"><span class="ico-big">${ICONS.chart}</span><span class="step-n">And</span></div>
      <h2>The merchant's dashboard</h2>
      <p>Revenue, renewals, late payers and webhooks, all computed from a viewing key. The server cannot spend a single zatoshi.</p>
      <div class="actions">${link(l.adminUrl, "Open dashboard")}</div>
    </article>
  </div>

  <section class="section two">
    <div class="card pad">
      <h2 class="big">Try it in two minutes</h2>
      <p class="sub">The plans here renew every few minutes so you can watch whole cycles. A block is mined every 15 seconds.</p>
      <ol class="try">
        <li><span><b>Open Cadence.</b> You'll see your shielded balance of test coins.</span></li>
        <li><span><b>Open the Private VPN checkout</b> and click Subscribe with Zcash.</span></li>
        <li><span><b>Read the limits and approve.</b> The checkout page flips to "Approved", then "First payment received".</span></li>
        <li><span><b>Watch it renew</b> in Cadence and on the merchant dashboard every two minutes.</span></li>
        <li><span><b>Revoke.</b> The next renewal is refused. Nothing else can be taken.</span></li>
      </ol>
    </div>
    <div class="card pad">
      <h2 class="big">What the chain sees</h2>
      <p class="sub">For every Cadence payment, read back from the chain:</p>
      <div class="seen">
        <div class="seen-row hide"><span>Who paid</span><span>hidden</span></div>
        <div class="seen-row hide"><span>Who was paid</span><span>hidden</span></div>
        <div class="seen-row hide"><span>How much</span><span>hidden</span></div>
        <div class="seen-row hide"><span>Transparent inputs and outputs</span><span>none</span></div>
        <div class="seen-row"><span>Public</span><span>block, fee, 2 shielded actions</span></div>
      </div>
      <p class="muted small" style="margin-top:14px">Check it yourself. This reads every payment from the node and runs the checks, including a known-leaky control that must fail:</p>
      <pre>${esc(l.proofCommand)}</pre>
    </div>
  </section>

  <section class="section">
    <h2 class="big">What's running on this machine</h2>
    <p class="sub">Nothing here touches a public network. Everything is local and real: real Zcash consensus, real shielded proofs.</p>
    <div class="running">
      <div class="run"><span class="live"></span>Zebra node · private regtest chain</div>
      <div class="run"><span class="live"></span>Zaino light-wallet server</div>
      <div class="run"><span class="live"></span>Merchant server · view-only wallet</div>
      <div class="run"><span class="live"></span>Cadence app · subscriber wallet</div>
      <div class="run"><span class="live"></span>Miner · one block every 15s</div>
    </div>
  </section>
</main>
<footer>Cadence · open source, MIT · built for ZECATHON 2026, Shielded Payments track.</footer>
<script src="/hub.js"></script>
</body></html>`;
}

export const HUB_JS = `"use strict";
(async function tick() {
  try {
    const s = await (await fetch("/status")).json();
    if (s.height !== null) document.getElementById("height").textContent = "block " + s.height.toLocaleString();
  } catch {}
  setTimeout(tick, 5000);
})();
`;
