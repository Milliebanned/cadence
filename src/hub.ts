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

const MARK = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d58e"/><stop offset=".55" stop-color="#e6ad45"/><stop offset="1" stop-color="#b47d1d"/></linearGradient></defs><circle cx="12" cy="12" r="9.25" stroke="#fff" stroke-opacity=".14" stroke-width="2.4"/><path d="M12 2.75a9.25 9.25 0 1 1-8.01 4.63" stroke="url(#mg)" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="2.7" fill="url(#mg)"/></svg>`;

/** The demo's front page: a product landing page with live links into each part of the demo. */
export function hubHtml(l: HubLinks): string {
  const vpn = l.checkoutUrls[0]!;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta name="color-scheme" content="dark">
<title>Cadence · Private autopay for Zcash</title>
<style>
:root{
  --bg:#08070a;--bg2:#0d0c10;--ink:#f6f2e9;--ink2:#cfc8b9;--muted:#8d8678;--faint:#5d584f;
  --stroke:rgba(255,255,255,.08);--stroke2:rgba(255,255,255,.14);--glass:rgba(255,255,255,.035);
  --gold:#e8b44c;--gold2:#f7d58e;--golddeep:#b47d1d;--ok:#5fd39a;
  --gradient:linear-gradient(135deg,#f7d58e 0%,#e8b44c 42%,#b47d1d 100%);
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{background:var(--bg);scroll-behavior:smooth}
body{margin:0;color:var(--ink);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;
  background:
    radial-gradient(1200px 620px at 72% -8%,rgba(232,180,76,.20),transparent 60%),
    radial-gradient(900px 520px at 8% 4%,rgba(232,180,76,.07),transparent 60%),
    var(--bg)}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 32px}
@media (max-width:720px){.wrap{padding:0 20px}}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:8px}
.mono{font-family:var(--mono)}
.gold{background:var(--gradient);-webkit-background-clip:text;background-clip:text;color:transparent}
.ico{width:18px;height:18px;flex:none}

/* nav */
nav{position:sticky;top:0;z-index:30;backdrop-filter:saturate(140%) blur(14px);background:rgba(8,7,10,.62);border-bottom:1px solid var(--stroke)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
.brand{display:flex;align-items:center;gap:11px;font-weight:650;font-size:18px;letter-spacing:-.02em}
.navlinks{display:flex;align-items:center;gap:30px;font-size:14px;color:var(--ink2)}
.navlinks a:hover{color:var(--ink)}
@media (max-width:860px){.navlinks .hide-s{display:none}}
.live{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink2);padding:6px 12px;border-radius:999px;border:1px solid var(--stroke2);background:var(--glass)}
.live i{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(95,211,154,.6);animation:ping 2s infinite}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(95,211,154,.55)}80%,100%{box-shadow:0 0 0 9px rgba(95,211,154,0)}}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:10px;font:600 15px/1 var(--sans);padding:15px 22px;border-radius:14px;border:1px solid var(--stroke2);color:var(--ink);background:var(--glass);transition:transform .2s,background .2s,border-color .2s,box-shadow .2s;cursor:pointer;white-space:nowrap}
.btn:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.24);transform:translateY(-1px)}
.btn .ico{width:17px;height:17px}
.btn.primary{background:var(--gradient);border-color:transparent;color:#1b1203;box-shadow:0 10px 40px -10px rgba(232,180,76,.65),inset 0 1px 0 rgba(255,255,255,.45)}
.btn.primary:hover{box-shadow:0 16px 50px -12px rgba(232,180,76,.85),inset 0 1px 0 rgba(255,255,255,.5)}
.btn.sm{padding:10px 16px;font-size:14px;border-radius:11px}

/* hero */
.hero{padding:96px 0 40px;position:relative}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
@media (max-width:1020px){.hero-grid{grid-template-columns:1fr;gap:64px}.hero{padding-top:64px}}
.kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;color:var(--ink2);padding:7px 14px 7px 8px;border-radius:999px;border:1px solid var(--stroke2);background:var(--glass)}
.kicker b{font-weight:650;color:#1b1203;background:var(--gradient);padding:3px 9px;border-radius:999px;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase}
h1{font-size:clamp(46px,6.6vw,88px);line-height:.98;letter-spacing:-.055em;font-weight:680;margin:26px 0 26px}
.lead{font-size:clamp(17px,1.6vw,20px);line-height:1.6;color:var(--ink2);max-width:36em;margin:0}
.ctas{display:flex;gap:14px;flex-wrap:wrap;margin-top:38px}
.proof-row{display:flex;gap:26px;flex-wrap:wrap;margin-top:44px;color:var(--muted);font-size:13.5px}
.proof-row span{display:inline-flex;align-items:center;gap:9px}.proof-row .ico{color:var(--gold)}

/* hero product mock */
.stage{position:relative;height:600px;perspective:1600px}
@media (max-width:1020px){.stage{height:600px;max-width:560px;margin:0 auto;width:100%}}
.glow{position:absolute;inset:8% 4% 10% 8%;background:radial-gradient(closest-side,rgba(232,180,76,.35),transparent);filter:blur(30px);z-index:0}
.panel{position:absolute;border-radius:24px;background:linear-gradient(180deg,rgba(28,25,20,.92),rgba(16,14,12,.92));border:1px solid var(--stroke2);box-shadow:0 50px 120px -30px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.02) inset,inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(10px)}
.sheet{z-index:2;left:8%;right:0;top:0;padding:28px;transform:rotateY(-9deg) rotateX(5deg);transform-origin:left center;animation:float 9s ease-in-out infinite}
@keyframes float{0%,100%{transform:rotateY(-9deg) rotateX(5deg) translateY(0)}50%{transform:rotateY(-7deg) rotateX(4deg) translateY(-10px)}}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:650}
.who{display:flex;align-items:center;gap:14px;margin-top:14px}
.av{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:750;font-size:18px;color:#1b1203;background:var(--gradient);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.who h3{margin:0;font-size:21px;letter-spacing:-.02em}.who p{margin:2px 0 0;font:12.5px var(--mono);color:var(--muted)}
.amt{margin:22px 0 18px;padding:18px 20px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid var(--stroke);display:flex;align-items:baseline;gap:10px}
.amt strong{font-size:40px;letter-spacing:-.04em;font-weight:680}.amt span{color:var(--muted);font-size:14px}
.cols{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;font-size:13.5px}
.cols ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:9px;color:var(--ink2)}
.cols li{display:flex;gap:8px;align-items:flex-start}.cols .ico{width:15px;height:15px;margin-top:3px}
.yes .ico{color:var(--ok)}.no .ico{color:#f08a7e}
.approve{margin-top:22px;display:flex;justify-content:flex-end;gap:10px}
.approve .btn{padding:12px 18px;font-size:14px}
.toast{z-index:4;right:-3%;top:-22px;width:292px;padding:14px 16px;border-radius:18px;display:flex;gap:13px;align-items:center;animation:toast 7s ease-in-out infinite}
@media (max-width:560px){.toast{right:0;width:250px}}
.toast .tick{width:38px;height:38px;border-radius:12px;background:rgba(95,211,154,.14);color:var(--ok);display:flex;align-items:center;justify-content:center;flex:none}
.toast strong{display:block;font-size:14.5px}.toast span{font-size:12.5px;color:var(--muted)}
@keyframes toast{0%,6%{opacity:.0;transform:translateY(-10px) scale(.97)}14%,80%{opacity:1;transform:none}92%,100%{opacity:0;transform:translateY(-6px)}}
.chain{z-index:3;left:-2%;bottom:0;width:300px;padding:16px 18px;border-radius:18px;transform:rotate(-1.5deg)}
@media (max-width:560px){.chain{left:0;width:250px}}
.chain .row{display:flex;justify-content:space-between;font-size:12.5px;padding:6px 0;border-top:1px solid var(--stroke)}
.chain .row:first-of-type{border-top:0;margin-top:8px}
.chain .row span:last-child{font-family:var(--mono);color:var(--ok)}
.chain .row.pub span:last-child{color:var(--ink2)}

/* sections */
section.block{padding:120px 0 0}
.sec-head{max-width:760px;margin-bottom:56px}
.sec-head .eyebrow{color:var(--gold)}
.sec-head h2{font-size:clamp(34px,4.2vw,54px);line-height:1.05;letter-spacing:-.045em;margin:16px 0 18px;font-weight:660}
.sec-head p{color:var(--ink2);font-size:18px;margin:0;max-width:40em}

/* flow */
.flow{position:relative;border-radius:28px;border:1px solid var(--stroke);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));padding:56px 40px 44px;overflow:hidden}
.flow::before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%);pointer-events:none}
.nodes{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;z-index:1}
@media (max-width:900px){.nodes{grid-template-columns:1fr 1fr;row-gap:36px}}
.node{text-align:center}
.node .orb{width:84px;height:84px;margin:0 auto 18px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#1d1a14,#121009);border:1px solid var(--stroke2);box-shadow:0 20px 50px -20px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.07);color:var(--gold)}
.node .orb .ico{width:32px;height:32px}
.node.pool .orb{background:radial-gradient(circle at 50% 40%,rgba(232,180,76,.25),#0f0d0a 70%);border-color:rgba(232,180,76,.35);box-shadow:0 0 60px -10px rgba(232,180,76,.5)}
.node h3{margin:0 0 6px;font-size:17px;letter-spacing:-.02em}
.node p{margin:0 auto;font-size:14px;color:var(--muted);max-width:22ch}
.track{position:absolute;left:12.5%;right:12.5%;top:98px;height:2px;background:linear-gradient(90deg,rgba(232,180,76,.0),rgba(232,180,76,.45),rgba(232,180,76,.45),rgba(232,180,76,0));z-index:0}
@media (max-width:900px){.track{display:none}}
.pulse{position:absolute;top:-5px;width:12px;height:12px;border-radius:50%;background:var(--gold2);box-shadow:0 0 18px 4px rgba(232,180,76,.7);animation:travel 5.5s linear infinite}
.pulse:nth-child(2){animation-delay:1.8s}.pulse:nth-child(3){animation-delay:3.6s}
@keyframes travel{0%{left:0;opacity:0}6%{opacity:1}44%{opacity:1;filter:none}50%{opacity:.08;filter:blur(4px)}62%{opacity:.08;filter:blur(4px)}70%{opacity:1;filter:none}94%{opacity:1}100%{left:100%;opacity:0}}
.hidden-tags{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:40px;position:relative;z-index:1}
.tag{font-size:12.5px;padding:7px 13px;border-radius:999px;border:1px solid var(--stroke2);color:var(--ink2);background:rgba(0,0,0,.25);display:inline-flex;gap:8px;align-items:center}
.tag .ico{width:14px;height:14px;color:var(--ok)}

/* stats */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:860px){.stats{grid-template-columns:1fr}}
.stat{padding:34px 32px;border-radius:24px;border:1px solid var(--stroke);background:var(--glass);position:relative;overflow:hidden}
.stat::after{content:"";position:absolute;inset:auto -30% -60% auto;width:260px;height:260px;background:radial-gradient(closest-side,rgba(232,180,76,.16),transparent);pointer-events:none}
.stat .big{font-size:76px;line-height:1;letter-spacing:-.06em;font-weight:680}
.stat h3{margin:18px 0 8px;font-size:19px;letter-spacing:-.02em}
.stat p{margin:0;color:var(--muted);font-size:15px}

/* compare */
.compare{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media (max-width:860px){.compare{grid-template-columns:1fr}}
.cmp{border-radius:24px;border:1px solid var(--stroke);padding:30px 30px 18px;background:var(--glass)}
.cmp.you{background:linear-gradient(180deg,rgba(232,180,76,.10),rgba(232,180,76,.02));border-color:rgba(232,180,76,.28)}
.cmp h3{margin:0 0 4px;font-size:20px;letter-spacing:-.02em}.cmp > p{margin:0 0 18px;color:var(--muted);font-size:14.5px}
.cmp .row{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid var(--stroke);font-size:15px}
.cmp .row span:first-child{color:var(--ink2)}
.cmp .row b{font-weight:600}
.hid{color:var(--ok);display:inline-flex;align-items:center;gap:7px}.hid .ico{width:15px;height:15px}

/* demo tiles */
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:960px){.tiles{grid-template-columns:1fr}}
.tile{position:relative;border-radius:26px;padding:30px;border:1px solid var(--stroke);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));display:flex;flex-direction:column;gap:14px;min-height:320px;transition:border-color .25s,transform .25s,box-shadow .25s}
.tile:hover{border-color:rgba(232,180,76,.4);transform:translateY(-3px);box-shadow:0 30px 80px -40px rgba(232,180,76,.45)}
.tile .n{font:600 13px var(--mono);color:var(--gold)}
.tile .t-ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(232,180,76,.1);color:var(--gold);border:1px solid rgba(232,180,76,.22)}
.tile .t-ico .ico{width:24px;height:24px}
.tile h3{margin:6px 0 0;font-size:23px;letter-spacing:-.03em}
.tile p{margin:0;color:var(--ink2);font-size:15px}
.tile .go{margin-top:auto;display:flex;gap:10px;flex-wrap:wrap}

/* steps + verify */
.split{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
@media (max-width:960px){.split{grid-template-columns:1fr}}
.card{border-radius:26px;border:1px solid var(--stroke);background:var(--glass);padding:32px}
.card h3{margin:0 0 6px;font-size:22px;letter-spacing:-.03em}.card > p{margin:0 0 22px;color:var(--muted)}
ol.steps{list-style:none;margin:0;padding:0;display:grid;gap:16px;counter-reset:s}
ol.steps li{display:grid;grid-template-columns:34px 1fr;gap:14px;counter-increment:s;color:var(--ink2);font-size:15.5px}
ol.steps li::before{content:counter(s);width:30px;height:30px;border-radius:10px;background:rgba(232,180,76,.12);border:1px solid rgba(232,180,76,.3);color:var(--gold2);font:600 13px var(--mono);display:flex;align-items:center;justify-content:center}
ol.steps b{color:var(--ink);font-weight:600}
.term{border-radius:18px;background:#050406;border:1px solid var(--stroke);overflow:hidden}
.term-bar{display:flex;gap:7px;padding:12px 14px;border-bottom:1px solid var(--stroke)}
.term-bar i{width:10px;height:10px;border-radius:50%;background:#2a2620}
.term pre{margin:0;padding:18px;font:12.5px/1.7 var(--mono);color:#d9d2c3;white-space:pre-wrap;word-break:break-all}
.term .c{color:var(--muted)}.term .ok{color:var(--ok)}.term .g{color:var(--gold2)}

/* run strip + footer */
.running{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
.running span{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;color:var(--ink2);padding:10px 15px;border-radius:12px;border:1px solid var(--stroke);background:var(--glass)}
.running i{width:7px;height:7px;border-radius:50%;background:var(--ok)}
.cta-band{margin-top:120px;border-radius:32px;padding:72px 40px;text-align:center;border:1px solid rgba(232,180,76,.25);background:radial-gradient(600px 260px at 50% 0%,rgba(232,180,76,.22),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))}
.cta-band h2{font-size:clamp(32px,4vw,52px);letter-spacing:-.045em;line-height:1.05;margin:0 0 16px}
.cta-band p{color:var(--ink2);margin:0 auto 32px;max-width:34em;font-size:17px}
.cta-band .ctas{justify-content:center;margin-top:0}
footer{padding:64px 0 48px;color:var(--faint);font-size:13.5px}
footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-top:1px solid var(--stroke);padding-top:28px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style></head><body>

<nav><div class="wrap">
  <a class="brand" href="#top">${MARK}Cadence</a>
  <div class="navlinks">
    <a class="hide-s" href="#how">How it works</a>
    <a class="hide-s" href="#privacy">Privacy</a>
    <a class="hide-s" href="#demo">Live demo</a>
    <span class="live" title="A private Zcash chain is running on this machine"><i></i><span id="height">Private chain</span></span>
  </div>
</div></nav>

<header class="hero" id="top"><div class="wrap hero-grid">
  <div>
    <span class="kicker"><b>Zcash</b> Shielded autopay, built for Zecathon 2026</span>
    <h1>Subscriptions that pay themselves. <span class="gold">Privately.</span></h1>
    <p class="lead">Zcash can't pull money from your wallet, so every subscription means remembering to pay. Cadence lets you approve once, with hard limits you sign, and pays each period for you. Every payment is fully shielded. Merchants never hold a key that can spend.</p>
    <div class="ctas">
      <a class="btn primary" href="${esc(l.appUrl)}" target="_blank" rel="noopener noreferrer">Open your Cadence ${ICONS.arrow}</a>
      <a class="btn" href="${esc(vpn.url)}" target="_blank" rel="noopener noreferrer">See a checkout</a>
    </div>
    <div class="proof-row">
      <span>${ICONS.shield}Shielded to shielded</span>
      <span>${ICONS.key}Keys never leave you</span>
      <span>${ICONS.eyeOff}Merchant is view-only</span>
    </div>
  </div>

  <div class="stage" aria-hidden="true">
    <div class="glow"></div>
    <div class="panel sheet">
      <div class="eyebrow">Review and approve</div>
      <div class="who"><div class="av">P</div><div><h3>Private VPN</h3><p>demo-vpn · checkout</p></div></div>
      <div class="amt"><strong>0.25 ZEC</strong><span>every 30 days · up to 12×</span></div>
      <div class="cols">
        <div class="yes"><div class="eyebrow">You allow</div><ul>
          <li>${ICONS.check}At most 0.25 ZEC per period</li>
          <li>${ICONS.check}3 ZEC in total, then it stops</li>
          <li>${ICONS.check}Shielded payments only</li></ul></div>
        <div class="no"><div class="eyebrow">They can never</div><ul>
          <li>${ICONS.x}Charge more or earlier</li>
          <li>${ICONS.x}See your balance</li>
          <li>${ICONS.x}Take after you revoke</li></ul></div>
      </div>
      <div class="approve"><span class="btn sm">Cancel</span><span class="btn sm primary">${ICONS.check} Approve</span></div>
    </div>
    <div class="panel toast"><div class="tick">${ICONS.check}</div><div><strong>Payment 3 of 12 sent</strong><span>Private VPN · 0.25 ZEC · shielded</span></div></div>
    <div class="panel chain"><div class="eyebrow">What the chain sees</div>
      <div class="row"><span>Sender</span><span>hidden</span></div>
      <div class="row"><span>Recipient</span><span>hidden</span></div>
      <div class="row"><span>Amount</span><span>hidden</span></div>
      <div class="row pub"><span>Public</span><span>fee · 2 actions</span></div>
    </div>
  </div>
</div></header>

<section class="block" id="how"><div class="wrap">
  <div class="sec-head">
    <span class="eyebrow">How it works</span>
    <h2>One approval. <span class="gold">Every payment after that, automatic.</span></h2>
    <p>You sign a mandate: who, how much, how often, how many times. Your Cadence agent pays each period and refuses anything outside it. The money moves inside the shielded pool, so the chain records that something happened, and nothing about who or how much.</p>
  </div>
  <div class="flow">
    <div class="track"><span class="pulse"></span><span class="pulse"></span><span class="pulse"></span></div>
    <div class="nodes">
      <div class="node"><div class="orb">${ICONS.key}</div><h3>You approve</h3><p>Exact amount, period and total, signed once.</p></div>
      <div class="node"><div class="orb">${ICONS.repeat}</div><h3>Your agent pays</h3><p>Checks every rule before each payment.</p></div>
      <div class="node pool"><div class="orb">${ICONS.shield}</div><h3>Shielded pool</h3><p>Sender, recipient and amount are encrypted.</p></div>
      <div class="node"><div class="orb">${ICONS.eyeOff}</div><h3>Merchant sees it</h3><p>With a viewing key only. It can't spend.</p></div>
    </div>
    <div class="hidden-tags">
      <span class="tag">${ICONS.check}New address every cycle</span>
      <span class="tag">${ICONS.check}No transparent fallback, ever</span>
      <span class="tag">${ICONS.check}Randomised send time</span>
      <span class="tag">${ICONS.check}Revoke stops it instantly</span>
    </div>
  </div>
</div></section>

<section class="block"><div class="wrap">
  <div class="stats">
    <div class="stat"><div class="big gold">0</div><h3>Transparent inputs or outputs</h3><p>In every payment Cadence sends. Checked on chain, not assumed.</p></div>
    <div class="stat"><div class="big gold">1</div><h3>Viewing key</h3><p>All the merchant server holds. A breach can't move a single zatoshi.</p></div>
    <div class="stat"><div class="big gold">1×</div><h3>Approval per subscription</h3><p>Then it runs by itself, inside the limits you signed, until you revoke.</p></div>
  </div>
</div></section>

<section class="block" id="privacy"><div class="wrap">
  <div class="sec-head">
    <span class="eyebrow">Privacy</span>
    <h2>The chain sees a payment. <span class="gold">Not your life.</span></h2>
    <p>Read back from the chain, a Cadence payment is a shielded transaction with a fee. Everything else stays between you and the merchant you chose.</p>
  </div>
  <div class="compare">
    <div class="cmp"><h3>Anyone watching the chain</h3><p>Public data for every Cadence payment</p>
      <div class="row"><span>Who paid</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>Who was paid</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>How much</span><span class="hid">${ICONS.eyeOff} hidden</span></div>
      <div class="row"><span>Links between payments</span><span class="hid">${ICONS.eyeOff} none</span></div>
      <div class="row"><span>What is public</span><b>block, fee, 2 actions</b></div>
    </div>
    <div class="cmp you"><h3>You and your merchant</h3><p>What each side knows, and nothing more</p>
      <div class="row"><span>You</span><b>every payment, every limit</b></div>
      <div class="row"><span>Merchant</span><b>this subscription is paid</b></div>
      <div class="row"><span>Merchant can't see</span><b>your balance, other payments</b></div>
      <div class="row"><span>Merchant can't do</span><b>charge, change, or keep charging</b></div>
      <div class="row"><span>Proof</span><b>one command, rerunnable</b></div>
    </div>
  </div>
</div></section>

<section class="block" id="demo"><div class="wrap">
  <div class="sec-head">
    <span class="eyebrow">Live demo · running on this machine</span>
    <h2>Try it end to end <span class="gold">in two minutes.</span></h2>
    <p>A real Zcash chain, real shielded proofs, real wallets. The demo plans renew every few minutes and a block is mined every 15 seconds, so you can watch whole cycles happen.</p>
  </div>
  <div class="tiles">
    <article class="tile"><span class="n">01 · open first</span><div class="t-ico">${ICONS.repeat}</div><h3>Your Cadence</h3><p>The subscriber's app. Review limits, approve, watch payments go out, revoke. The checkout hands off to it.</p>
      <div class="go"><a class="btn primary sm" href="${esc(l.appUrl)}" target="_blank" rel="noopener noreferrer">Open Cadence ${ICONS.arrow}</a></div></article>
    <article class="tile"><span class="n">02 · then</span><div class="t-ico">${ICONS.store}</div><h3>A merchant's checkout</h3><p>What a customer sees on a shop's site. Click Subscribe with Zcash, approve, and watch the page confirm the first payment.</p>
      <div class="go">${l.checkoutUrls.map((c, i) => `<a class="btn ${i === 0 ? "primary " : ""}sm" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a>`).join("")}</div></article>
    <article class="tile"><span class="n">03 · and</span><div class="t-ico">${ICONS.chart}</div><h3>Merchant dashboard</h3><p>Revenue, renewals, late payers and webhooks, all computed from a viewing key. This server cannot spend.</p>
      <div class="go"><a class="btn sm" href="${esc(l.adminUrl)}" target="_blank" rel="noopener noreferrer">Open dashboard ${ICONS.arrow}</a></div></article>
  </div>
  <div class="split">
    <div class="card"><h3>The two-minute tour</h3><p>Follow these in order.</p>
      <ol class="steps">
        <li><span><b>Open Cadence.</b> Your shielded test balance is already there.</span></li>
        <li><span><b>Open the Private VPN checkout</b> and click Subscribe with Zcash.</span></li>
        <li><span><b>Read the limits, approve.</b> The checkout flips to “first payment received”.</span></li>
        <li><span><b>Watch it renew</b> every two minutes, in Cadence and on the dashboard.</span></li>
        <li><span><b>Revoke.</b> The next renewal is refused. Nothing else can be taken.</span></li>
      </ol>
    </div>
    <div class="card"><h3>Don't trust us. Verify.</h3><p>Reads every payment back from the node and checks it, with a known-leaky control that must fail.</p>
      <div class="term"><div class="term-bar"><i></i><i></i><i></i></div>
<pre><span class="c">$</span> ${esc(l.proofCommand)}

<span class="g"># summary of the report it prints</span>
no transparent inputs ............ <span class="ok">PASS</span>
no transparent outputs ........... <span class="ok">PASS</span>
amount appears nowhere public .... <span class="ok">PASS</span>
every cycle a different address .. <span class="ok">PASS</span>
control (leaky tx) ............... <span class="ok">caught</span>
<span class="ok">ALL CHECKS PASS</span></pre></div>
    </div>
  </div>
  <div class="running">
    <span><i></i>Zebra node · private regtest</span><span><i></i>Zaino light-wallet server</span><span><i></i>Merchant · view-only wallet</span><span><i></i>Cadence · subscriber wallet</span><span><i></i>Miner · a block every 15s</span>
  </div>

  <div class="cta-band">
    <h2>Approve once. <span class="gold">Stay private forever.</span></h2>
    <p>Open your Cadence, then subscribe from the checkout. The whole loop runs on this machine.</p>
    <div class="ctas"><a class="btn primary" href="${esc(l.appUrl)}" target="_blank" rel="noopener noreferrer">Open your Cadence ${ICONS.arrow}</a><a class="btn" href="${esc(vpn.url)}" target="_blank" rel="noopener noreferrer">Go to checkout</a></div>
  </div>
</div></section>

<footer><div class="wrap"><span>Cadence · private autopay for Zcash · MIT licensed</span><span>Built for ZECATHON 2026 · Shielded Payments</span></div></footer>
<script src="/hub.js"></script>
</body></html>`;
}

export const HUB_JS = `"use strict";
(async function tick() {
  try {
    const s = await (await fetch("/status")).json();
    if (s.height !== null) document.getElementById("height").textContent = "Live · block " + s.height.toLocaleString();
  } catch {}
  setTimeout(tick, 5000);
})();
`;
