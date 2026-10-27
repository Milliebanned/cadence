import { ICONS } from "./ui/theme.ts";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface HubLinks {
  appUrl: string;
  adminUrl: string;
  checkoutUrls: Array<{ name: string; url: string }>;
  proofCommand: string;
}

/** Cadence mark: a ring broken by one gap, the beat of a recurring payment. */
const MARK = `<svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3.5a12.5 12.5 0 1 1-10.83 6.25" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><circle cx="16" cy="16" r="4" fill="currentColor"/></svg>`;

/** The demo's front page. The hero light is drawn live on a canvas as a halftone dot screen. */
export function hubHtml(l: HubLinks): string {
  const vpn = l.checkoutUrls[0]!;
  const out = (url: string) => `href="${esc(url)}" target="_blank" rel="noopener noreferrer"`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta name="color-scheme" content="dark">
<title>Cadence · Private autopay for Zcash</title>
<style>
:root{
  --night:#040b1d;--navy:#071431;--deep:#0b1f4a;--blue:#2a63d4;--sky:#7fb4ff;--ice:#d9ebff;
  --ink:#f4f8ff;--ink2:#b9c8e4;--muted:#7387ab;--faint:#41537a;
  --line:rgba(185,210,255,.12);--line2:rgba(185,210,255,.22);--tab:rgba(10,28,66,.55);
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{background:var(--night)}
body{margin:0;color:var(--ink);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;background:var(--night)}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--sky);outline-offset:3px}
.ico{width:18px;height:18px;flex:none}
.mono{font-family:var(--mono)}
.shell{max-width:1360px;margin:0 auto;padding:18px}
@media (max-width:720px){.shell{padding:10px}}

/* halftone texture, the same dot screen as the hero, for the rest of the page */
.dots{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(160,200,255,.55) 1.05px,transparent 1.6px);background-size:7px 7px}

/* ---------- hero ---------- */
.hero{position:relative;min-height:min(880px,calc(100vh - 36px));border-radius:22px;overflow:hidden;background:radial-gradient(120% 90% at 85% 50%,#0d2a66 0%,#071431 45%,#040b1d 100%);isolation:isolate}
#beam{position:absolute;inset:0;width:100%;height:100%;z-index:0;display:block}
.hero-ui{position:relative;z-index:2;height:100%;min-height:inherit;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr auto;padding:30px 34px 34px}
@media (max-width:720px){.hero-ui{padding:20px 18px 22px}}
.top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0}
.wordmark{display:flex;align-items:center;gap:14px;font-size:clamp(34px,4.6vw,58px);font-weight:450;letter-spacing:-.045em;line-height:1;color:#fff}
.wordmark .mark{width:clamp(36px,4.4vw,54px);height:clamp(36px,4.4vw,54px);color:#fff}
.nav{display:flex;gap:2px;align-items:stretch}
.nav a,.nav span.chain{display:flex;align-items:center;font-size:12.5px;color:var(--ink2);background:var(--tab);backdrop-filter:blur(10px);border:1px solid rgba(185,210,255,.07);padding:0 22px;height:40px;min-width:96px;transition:background .2s,color .2s}
.nav a:hover{background:rgba(20,48,104,.7);color:#fff}
.nav .chain{gap:8px}
.nav .chain i{width:6px;height:6px;border-radius:50%;background:#6ff0b2;box-shadow:0 0 10px #6ff0b2}
.nav .login{background:#fff;color:#081633;font-weight:550;gap:26px;justify-content:space-between;margin-left:6px;border-color:#fff}
.nav .login:hover{background:var(--ice);color:#081633}
@media (max-width:980px){.nav .hide{display:none}}
@media (max-width:560px){.nav a.login{padding:0 14px;min-width:0;gap:10px}.nav .chain{display:none!important}.wordmark{font-size:30px;gap:10px}.wordmark .mark{width:30px;height:30px}.btn-w{min-width:0;width:100%}}
.copy{align-self:end;max-width:560px;text-shadow:0 1px 18px rgba(4,11,29,.85)}
.copy h1{margin:0;font-size:clamp(34px,4.3vw,58px);line-height:1.04;font-weight:500;letter-spacing:-.035em;color:#fff}
.copy p{margin:20px 0 0;max-width:30em;color:var(--ink2);font-size:clamp(15px,1.25vw,17px);line-height:1.55}
.cta{display:flex;align-items:center;gap:26px;margin-top:34px;flex-wrap:wrap}
.btn-w{display:inline-flex;align-items:center;justify-content:space-between;gap:34px;height:52px;padding:0 20px 0 22px;background:#fff;color:#081633;font-weight:560;font-size:15px;border-radius:3px;transition:background .2s,transform .2s;min-width:220px}
.btn-w:hover{background:var(--ice);transform:translateY(-1px)}
.btn-w .ico{width:17px;height:17px}
.note{display:inline-flex;align-items:center;gap:10px;color:var(--ink2);font-size:13.5px}
.note::before{content:"";width:5px;height:5px;border-radius:50%;background:#fff}
.legend{position:absolute;right:34px;bottom:34px;z-index:2;display:grid;gap:7px;font:12px var(--mono);color:var(--ink2);text-align:right;padding:14px 16px;background:rgba(4,11,29,.72);backdrop-filter:blur(8px);border:1px solid var(--line)}
.legend b{color:#fff;font-weight:500}
@media (max-width:900px){.legend{display:none}}

/* ---------- sections ---------- */
section{position:relative;padding:130px 34px 0;max-width:1360px;margin:0 auto}
@media (max-width:720px){section{padding:90px 18px 0}}
.label{display:inline-flex;align-items:center;gap:10px;font:12px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--sky)}
.label::before{content:"";width:18px;height:1px;background:var(--sky)}
h2{margin:18px 0 0;font-size:clamp(32px,3.8vw,52px);line-height:1.06;font-weight:500;letter-spacing:-.035em;max-width:17em}
h2 em{font-style:normal;color:var(--sky)}
.intro{margin:20px 0 0;color:var(--ink2);font-size:17.5px;max-width:38em}

/* flow */
.flow{position:relative;margin-top:60px;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:linear-gradient(180deg,rgba(13,36,84,.35),rgba(4,11,29,.2))}
.flow .dots{opacity:.22;-webkit-mask-image:radial-gradient(60% 80% at 50% 50%,#000,transparent);mask-image:radial-gradient(60% 80% at 50% 50%,#000,transparent)}
.steps{position:relative;display:grid;grid-template-columns:repeat(4,1fr)}
@media (max-width:900px){.steps{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.steps{grid-template-columns:1fr}}
.step{padding:40px 30px 36px;border-left:1px solid var(--line)}
.step:first-child{border-left:0}
@media (max-width:900px){.step:nth-child(3){border-left:0}.step{border-top:1px solid var(--line)}.step:nth-child(-n+2){border-top:0}}
@media (max-width:520px){.step{border-left:0!important;border-top:1px solid var(--line)!important}.step:first-child{border-top:0!important}}
.step .n{font:12px var(--mono);color:var(--muted)}
.step .ic{width:46px;height:46px;margin:26px 0 22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--line2);color:var(--ice);background:radial-gradient(circle at 50% 35%,rgba(127,180,255,.22),rgba(4,11,29,.6))}
.step.pool .ic{box-shadow:0 0 40px rgba(127,180,255,.45);border-color:rgba(127,180,255,.5)}
.step h3{margin:0 0 8px;font-size:19px;font-weight:550;letter-spacing:-.02em}
.step p{margin:0;color:var(--muted);font-size:14.5px}
.strip{position:relative;display:flex;gap:28px;flex-wrap:wrap;padding:18px 30px;border-top:1px solid var(--line);font:12.5px var(--mono);color:var(--ink2)}
.strip span{display:inline-flex;gap:9px;align-items:center}.strip span::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--sky)}

/* numbers */
.numbers{display:grid;grid-template-columns:repeat(3,1fr);margin-top:60px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
@media (max-width:860px){.numbers{grid-template-columns:1fr}}
.num{position:relative;padding:44px 30px 40px;border-left:1px solid var(--line);overflow:hidden}
.num:first-child{border-left:0}
@media (max-width:860px){.num{border-left:0;border-top:1px solid var(--line)}.num:first-child{border-top:0}}
.num .dots{opacity:.18;-webkit-mask-image:radial-gradient(70% 70% at 100% 100%,#000,transparent);mask-image:radial-gradient(70% 70% at 100% 100%,#000,transparent);transition:opacity .4s}
.num:hover .dots{opacity:.4}
.num strong{position:relative;display:block;font-size:clamp(64px,7vw,104px);line-height:.9;font-weight:400;letter-spacing:-.06em;color:#fff}
.num h3{position:relative;margin:26px 0 8px;font-size:18px;font-weight:550;letter-spacing:-.02em}
.num p{position:relative;margin:0;color:var(--muted);font-size:15px;max-width:22em}

/* compare */
.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:60px}
@media (max-width:860px){.compare{grid-template-columns:1fr}}
.pane{position:relative;border:1px solid var(--line);border-radius:20px;padding:30px 30px 14px;overflow:hidden;background:rgba(7,20,49,.45)}
.pane.lit{background:radial-gradient(120% 90% at 100% 0%,rgba(42,99,212,.35),rgba(7,20,49,.5) 60%);border-color:rgba(127,180,255,.3)}
.pane.lit .dots{opacity:.25;-webkit-mask-image:radial-gradient(80% 70% at 100% 0%,#000,transparent);mask-image:radial-gradient(80% 70% at 100% 0%,#000,transparent)}
.pane h3{position:relative;margin:0;font-size:20px;font-weight:550;letter-spacing:-.02em}
.pane .sub{position:relative;margin:4px 0 16px;color:var(--muted);font-size:14.5px}
.row{position:relative;display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid var(--line);font-size:15px}
.row span:first-child{color:var(--ink2)}
.row b{font-weight:500;color:#fff;text-align:right}
.hid{color:#8fd6ff;display:inline-flex;gap:8px;align-items:center;font-family:var(--mono);font-size:13.5px}
.hid .ico{width:15px;height:15px}

/* demo */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:60px}
@media (max-width:960px){.tiles{grid-template-columns:1fr}}
.tile{position:relative;display:flex;flex-direction:column;min-height:340px;padding:30px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:linear-gradient(180deg,rgba(13,36,84,.4),rgba(4,11,29,.3));transition:border-color .3s,transform .3s}
.tile .dots{opacity:.12;transition:opacity .5s;-webkit-mask-image:radial-gradient(90% 70% at 80% 0%,#000,transparent);mask-image:radial-gradient(90% 70% at 80% 0%,#000,transparent)}
.tile:hover{border-color:rgba(127,180,255,.45);transform:translateY(-3px)}
.tile:hover .dots{opacity:.4}
.tile .n{position:relative;font:12px var(--mono);color:var(--sky)}
.tile h3{position:relative;margin:70px 0 10px;font-size:26px;font-weight:500;letter-spacing:-.03em}
.tile p{position:relative;margin:0;color:var(--ink2);font-size:15px}
.tile .go{position:relative;margin-top:auto;padding-top:26px;display:flex;gap:8px;flex-wrap:wrap}
.btn-o{display:inline-flex;align-items:center;gap:14px;height:44px;padding:0 16px;border:1px solid var(--line2);border-radius:3px;font-size:14px;color:#fff;background:rgba(4,11,29,.4);transition:background .2s,border-color .2s}
.btn-o:hover{background:rgba(42,99,212,.25);border-color:rgba(127,180,255,.5)}
.btn-o.w{background:#fff;color:#081633;border-color:#fff;font-weight:550}.btn-o.w:hover{background:var(--ice)}
.btn-o .ico{width:15px;height:15px}

.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
@media (max-width:960px){.pair{grid-template-columns:1fr}}
.box{border:1px solid var(--line);border-radius:20px;padding:30px;background:rgba(7,20,49,.45)}
.box h3{margin:0 0 6px;font-size:21px;font-weight:550;letter-spacing:-.02em}
.box > p{margin:0 0 24px;color:var(--muted)}
ol.tour{list-style:none;margin:0;padding:0;display:grid;counter-reset:t}
ol.tour li{display:grid;grid-template-columns:44px 1fr;gap:10px;padding:13px 0;border-top:1px solid var(--line);counter-increment:t;color:var(--ink2);font-size:15.5px}
ol.tour li:first-child{border-top:0}
ol.tour li::before{content:"0" counter(t);font:13px var(--mono);color:var(--sky);padding-top:2px}
ol.tour b{color:#fff;font-weight:550}
.term{border:1px solid var(--line);border-radius:14px;background:#020713;overflow:hidden}
.term pre{margin:0;padding:20px;font:12.5px/1.75 var(--mono);color:#c7d6f2;white-space:pre-wrap;word-break:break-all}
.term .c{color:var(--muted)}.term .ok{color:#6ff0b2}.term .h{color:var(--sky)}

/* finale */
.finale{position:relative;margin:130px auto 0;max-width:1324px;border-radius:22px;overflow:hidden;padding:110px 34px;text-align:center;background:radial-gradient(70% 120% at 50% 100%,#14408f 0%,#071431 55%,#040b1d 100%)}
.finale .dots{opacity:.32;-webkit-mask-image:radial-gradient(60% 90% at 50% 100%,#000,transparent);mask-image:radial-gradient(60% 90% at 50% 100%,#000,transparent)}
.finale h2{position:relative;margin:0 auto;max-width:14em;font-size:clamp(34px,4.6vw,64px)}
.finale p{position:relative;color:var(--ink2);margin:20px auto 36px;max-width:32em;font-size:17px}
.finale .cta{position:relative;justify-content:center;margin-top:0}
footer{max-width:1360px;margin:0 auto;padding:44px 34px 48px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--faint);font:12.5px var(--mono)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>

<div class="shell">
<header class="hero" id="top">
  <canvas id="beam" aria-hidden="true"></canvas>
  <div class="hero-ui">
    <div class="top">
      <a class="wordmark" href="#top" aria-label="Cadence home">${MARK}cadence</a>
      <nav class="nav" aria-label="Sections">
        <a class="hide" href="#how">How it works</a>
        <a class="hide" href="#privacy">Privacy</a>
        <a class="hide" href="#demo">Live demo</a>
        <span class="chain" title="A private Zcash chain is running on this machine"><i></i><span id="height">Chain live</span></span>
        <a class="login" ${out(l.appUrl)}>Open Cadence ${ICONS.arrow}</a>
      </nav>
    </div>
    <div></div>
    <div class="copy">
      <h1>Private autopay for Zcash subscriptions</h1>
      <p>Approve a subscription once, with limits you sign. Cadence pays every period for you, shielded end to end. Merchants get paid without ever holding a key that can spend.</p>
      <div class="cta">
        <a class="btn-w" ${out(l.appUrl)}>Open your Cadence ${ICONS.arrow}</a>
        <span class="note">Live on a private Zcash chain</span>
      </div>
    </div>
  </div>
  <div class="legend" aria-hidden="true"><span>sender <b>hidden</b></span><span>recipient <b>hidden</b></span><span>amount <b>hidden</b></span></div>
</header>
</div>

<section id="how">
  <span class="label">How it works</span>
  <h2>One approval. <em>Every payment after that is automatic.</em></h2>
  <p class="intro">You sign a mandate: who, how much, how often, how many times. Your Cadence agent pays each period and refuses anything outside it. Value moves inside Zcash's shielded pool, so the chain records that a payment happened and nothing about who or how much.</p>
  <div class="flow">
    <div class="dots"></div>
    <div class="steps">
      <div class="step"><span class="n">01</span><div class="ic">${ICONS.key}</div><h3>You approve</h3><p>Exact amount, period and total, signed once on your device.</p></div>
      <div class="step"><span class="n">02</span><div class="ic">${ICONS.repeat}</div><h3>Your agent pays</h3><p>Every rule is checked before each payment. Anything else is refused.</p></div>
      <div class="step pool"><span class="n">03</span><div class="ic">${ICONS.shield}</div><h3>Shielded pool</h3><p>Sender, recipient and amount are encrypted on chain.</p></div>
      <div class="step"><span class="n">04</span><div class="ic">${ICONS.eyeOff}</div><h3>Merchant sees it</h3><p>Through a viewing key only. It can confirm payment, never spend.</p></div>
    </div>
    <div class="strip"><span>new address every cycle</span><span>no transparent fallback</span><span>randomised send time</span><span>revoke stops it instantly</span></div>
  </div>
</section>

<section>
  <div class="numbers">
    <div class="num"><div class="dots"></div><strong>0</strong><h3>Transparent inputs or outputs</h3><p>In every Cadence payment. Read back from the chain, not assumed.</p></div>
    <div class="num"><div class="dots"></div><strong>1</strong><h3>Viewing key on the server</h3><p>All a merchant holds. A breach can't move a single zatoshi.</p></div>
    <div class="num"><div class="dots"></div><strong>1×</strong><h3>Approval per subscription</h3><p>Then it runs inside your limits until you revoke.</p></div>
  </div>
</section>

<section id="privacy">
  <span class="label">Privacy</span>
  <h2>The chain sees a payment. <em>Not your life.</em></h2>
  <p class="intro">Read back from the chain, a Cadence payment is a shielded transaction and a fee. Everything else stays between you and the merchant you chose.</p>
  <div class="compare">
    <div class="pane"><h3>Anyone watching the chain</h3><p class="sub">Public data for every Cadence payment</p>
      <div class="row"><span>Who paid</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>Who was paid</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>How much</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>Links between payments</span><span class="hid">${ICONS.eyeOff} none</span></div>
      <div class="row"><span>What is public</span><b>block, fee, 2 actions</b></div>
    </div>
    <div class="pane lit"><div class="dots"></div><h3>You and your merchant</h3><p class="sub">What each side knows, and nothing more</p>
      <div class="row"><span>You</span><b>every payment, every limit</b></div>
      <div class="row"><span>Merchant</span><b>this subscription is paid</b></div>
      <div class="row"><span>Merchant can't see</span><b>your balance, other payments</b></div>
      <div class="row"><span>Merchant can't do</span><b>charge, change, keep charging</b></div>
      <div class="row"><span>Proof</span><b>one command, rerunnable</b></div>
    </div>
  </div>
</section>

<section id="demo">
  <span class="label">Live demo · running on this machine</span>
  <h2>Try the whole loop <em>in two minutes.</em></h2>
  <p class="intro">A real Zcash chain, real shielded proofs, real wallets. Demo plans renew every few minutes and blocks are mined whenever a payment needs confirming, so you can watch whole cycles happen.</p>
  <div class="tiles">
    <article class="tile"><div class="dots"></div><span class="n">01 · open first</span><h3>Your Cadence</h3><p>The subscriber's app. Review limits, approve, watch payments go out, revoke any time.</p>
      <div class="go"><a class="btn-o w" ${out(l.appUrl)}>Open Cadence ${ICONS.arrow}</a></div></article>
    <article class="tile"><div class="dots"></div><span class="n">02 · then</span><h3>A merchant's checkout</h3><p>What a customer sees on a shop's site. Subscribe with Zcash and watch the page confirm the first payment.</p>
      <div class="go">${l.checkoutUrls.map((c) => `<a class="btn-o" ${out(c.url)}>${esc(c.name)} ${ICONS.arrow}</a>`).join("")}</div></article>
    <article class="tile"><div class="dots"></div><span class="n">03 · and</span><h3>Merchant dashboard</h3><p>Revenue, renewals, late payers and webhooks, computed from a viewing key alone.</p>
      <div class="go"><a class="btn-o" ${out(l.adminUrl)}>Open dashboard ${ICONS.arrow}</a></div></article>
  </div>
  <div class="pair">
    <div class="box"><h3>The two-minute tour</h3><p>Follow these in order.</p>
      <ol class="tour">
        <li><span><b>Open Cadence.</b> Your shielded test balance is already there.</span></li>
        <li><span><b>Open the Private VPN checkout</b> and click Subscribe with Zcash.</span></li>
        <li><span><b>Read the limits, approve.</b> The checkout flips to “first payment received”.</span></li>
        <li><span><b>Watch it renew</b> every two minutes, in Cadence and on the dashboard.</span></li>
        <li><span><b>Revoke.</b> The next renewal is refused. Nothing else can be taken.</span></li>
      </ol>
    </div>
    <div class="box"><h3>Don't trust us. Verify.</h3><p>Reads every payment back from the node and checks it, with a known-leaky control that must fail.</p>
      <div class="term"><pre><span class="c">$</span> ${esc(l.proofCommand)}

<span class="h"># summary of the report it prints</span>
no transparent inputs ............ <span class="ok">PASS</span>
no transparent outputs ........... <span class="ok">PASS</span>
amount appears nowhere public .... <span class="ok">PASS</span>
every cycle a different address .. <span class="ok">PASS</span>
control (leaky tx) ............... <span class="ok">caught</span>
<span class="ok">ALL CHECKS PASS</span></pre></div>
    </div>
  </div>
</section>

<div class="shell">
  <div class="finale">
    <div class="dots"></div>
    <h2>Approve once. <em>Stay private for good.</em></h2>
    <p>Open your Cadence, then subscribe from a checkout. The whole loop runs on this machine.</p>
    <div class="cta"><a class="btn-w" ${out(l.appUrl)}>Open your Cadence ${ICONS.arrow}</a><a class="btn-o" ${out(vpn.url)}>Go to checkout ${ICONS.arrow}</a></div>
  </div>
</div>
<footer><span>cadence · private autopay for zcash · MIT</span><span>ZECATHON 2026 · Shielded Payments</span></footer>
<script src="/hub.js"></script>
</body></html>`;
}

/** Hero light as a halftone screen: every dot's radius follows the brightness of a light field
 *  (a beam opening from a glowing core, plus soft haze lobes). Particles spray from the core
 *  and orbit lines circle it. Static if the visitor prefers reduced motion. */
export const HUB_JS = `"use strict";
(() => {
  const heightEl = document.getElementById("height");
  (async function tick() {
    try {
      const s = await (await fetch("/status")).json();
      if (s.height !== null) heightEl.textContent = "Block " + s.height.toLocaleString();
    } catch {}
    setTimeout(tick, 5000);
  })();

  const canvas = document.getElementById("beam");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, core = { x: 0, y: 0 }, halftone = null, parts = [], orbits = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Brightness of the light field at a point, 0..1.
  function field(x, y) {
    const dx = (x - core.x) / W, dy = (y - core.y) / H;
    let v = 0;
    if (dx > -0.02) {
      const t = Math.max(dx, 0);
      const spread = 0.01 + t * 0.4;
      const beam = Math.exp(-(dy * dy) / (2 * spread * spread)) * (0.3 + 0.7 * Math.min(1, t * 2.6));
      v = Math.max(v, beam * (1.0 - 0.18 * t));
    }
    const r = Math.hypot(dx * 1.6, dy);
    v = Math.max(v, Math.exp(-(r * r) / 0.0009));
    const lob = (cy) => Math.exp(-(((dx - 0.5) ** 2) / 0.07 + ((dy - cy) ** 2) / 0.012));
    v = Math.max(v, 0.3 * lob(-0.36), 0.3 * lob(0.36));
    v += 0.16 * Math.exp(-((dx - 0.66) ** 2) / 0.04 - (dy * dy) / 0.05);
    return clamp(v, 0, 1);
  }
  function color(v) {
    const stops = [[4, 11, 29], [18, 52, 128], [72, 140, 245], [215, 235, 255]];
    const p = v * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), f = p - i;
    const a = stops[i], b = stops[i + 1];
    return "rgb(" + (a[0] + (b[0] - a[0]) * f | 0) + "," + (a[1] + (b[1] - a[1]) * f | 0) + "," + (a[2] + (b[2] - a[2]) * f | 0) + ")";
  }

  function buildHalftone() {
    const off = document.createElement("canvas");
    off.width = W * dpr; off.height = H * dpr;
    const o = off.getContext("2d");
    o.scale(dpr, dpr);
    const step = W < 700 ? 6 : 7.5;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        const v = field(x, y);
        if (v < 0.035) continue;
        const r = Math.max(0.5, step * 0.46 * Math.sqrt(v)); // dots never touch, so the screen stays visible
        o.fillStyle = color(Math.min(1, v * 1.05));
        o.beginPath(); o.arc(x, y, r, 0, Math.PI * 2); o.fill();
      }
    }
    halftone = off;
  }

  function spawn(p, fresh) {
    const t = Math.pow(Math.random(), 1.8);
    p.x = core.x + (fresh ? t * W * 0.55 : Math.random() * 8);
    p.y = core.y;
    p.vy = (Math.random() - 0.5) * 1.5;
    p.speed = 0.35 + Math.random() * 1.1;
    p.size = Math.random() < 0.12 ? 1.8 : 1.1;
    if (fresh) p.y += p.vy * (0.15 + t * 2.4) * (t * W * 0.55) / p.speed * 0.5;
    return p;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    core = { x: W * (W < 700 ? 0.18 : 0.3), y: H * 0.47 };
    buildHalftone();
    const n = W < 700 ? 700 : 2200;
    parts = Array.from({ length: n }, () => spawn({}, true));
    orbits = [
      { rx: W * 0.17, ry: H * 0.24, rot: -0.12, speed: 0.0021, a: 0.6, off: 0.18 },
      { rx: W * 0.27, ry: H * 0.13, rot: 0.06, speed: 0.0013, a: 2.4, off: 0.24 },
      { rx: W * 0.36, ry: H * 0.30, rot: -0.04, speed: 0.0009, a: 4.1, off: 0.33 },
    ];
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(halftone, 0, 0, W, H);

    ctx.lineWidth = 1;
    for (const o of orbits) {
      const cx = core.x + o.rx * o.off * 2.4;
      ctx.save(); ctx.translate(cx, core.y); ctx.rotate(o.rot);
      ctx.strokeStyle = "rgba(205,225,255,.22)";
      ctx.beginPath(); ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2); ctx.stroke();
      if (!still) o.a += o.speed;
      const px = Math.cos(o.a) * o.rx, py = Math.sin(o.a) * o.ry;
      ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(160,205,255,.9)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    for (const p of parts) {
      if (!still) {
        p.x += p.speed;
        const t = (p.x - core.x) / W;
        p.y += p.vy * (0.15 + t * 2.4);
        if (p.x > core.x + W * 0.6 || Math.abs(p.y - core.y) > H * 0.5) spawn(p, false);
      }
      const t = (p.x - core.x) / W;
      const a = Math.max(0, 1 - t * 1.25);
      ctx.fillStyle = "rgba(235,245,255," + a.toFixed(3) + ")";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 46);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(230,242,255,.95)");
    g.addColorStop(0.45, "rgba(127,180,255,.35)"); g.addColorStop(1, "rgba(127,180,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(core.x, core.y, 46, 0, Math.PI * 2); ctx.fill();
    const rx = core.x - Math.min(70, W * 0.05);
    ctx.strokeStyle = "rgba(160,200,255,.6)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(rx, core.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(rx, core.y, 3, 0, Math.PI * 2); ctx.fill();

    if (!still) requestAnimationFrame(frame);
  }

  let timer = 0;
  window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => { resize(); if (still) frame(); }, 120); });
  resize();
  frame();
})();
`;
