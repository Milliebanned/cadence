import { ICONS, LOGO_SVG, THEME_CSS } from "./ui/theme.ts";

export const APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Cadence</title>
<link rel="stylesheet" href="/app.css">
</head>
<body>
<header class="band">
  <div class="band-inner">
    <div class="logo">${LOGO_SVG}Cadence</div>
    <div class="band-right">
      <span id="network" class="chip"></span>
      <div class="bal" title="Spendable shielded balance in this wallet">
        <span class="bal-label">${ICONS.lock} Shielded balance</span>
        <strong id="balance" class="num">…</strong>
      </div>
    </div>
  </div>
</header>

<main class="page">
  <p id="top-error" class="error banner hidden" role="alert"></p>

  <section class="hero" aria-label="Overview">
    <div class="card pad next" id="next"></div>
    <div class="card pad stat"><span class="eyebrow">Running</span><strong id="s-running" class="num">–</strong><span class="muted small">subscriptions</span></div>
    <div class="card pad stat"><span class="eyebrow">Still approved</span><strong id="s-remaining" class="num">–</strong><span class="muted small">ZEC you allowed but haven't paid</span></div>
    <div class="card pad stat"><span class="eyebrow">Paid so far</span><strong id="s-paid" class="num">–</strong><span class="muted small">ZEC, all shielded</span></div>
  </section>

  <div class="layout">
    <section aria-labelledby="subs-title">
      <div class="section-head">
        <h1 id="subs-title">Subscriptions</h1>
        <p class="muted">Each one can only take what you approved. Revoke stops it immediately.</p>
      </div>
      <div id="subs" class="subs"></div>
    </section>

    <aside class="side">
      <section class="card pad" aria-labelledby="add-title">
        <h2 id="add-title">Add a subscription</h2>
        <p class="muted small add-lead">Nothing is paid until you review and approve the limits.</p>
        <div class="seg" role="tablist" aria-label="How to add">
          <button role="tab" class="seg-btn active" data-tab="offer" aria-selected="true">From a merchant</button>
          <button role="tab" class="seg-btn" data-tab="direct" aria-selected="false">Pay an address</button>
        </div>
        <form id="form-offer" class="form" autocomplete="off">
          <div class="field">
            <label for="offerUrl">Subscription link</label>
            <input class="input" id="offerUrl" name="offerUrl" placeholder="https://shop.example/offer/plan" required>
            <span class="hint">The merchant's checkout page fills this in for you.</span>
          </div>
          <div class="field">
            <label for="cycles">Limit the number of payments</label>
            <input class="input" id="cycles" name="cycles" inputmode="numeric" pattern="[0-9]*" placeholder="Plan maximum">
          </div>
          <button class="btn primary block" type="submit">Review limits ${ICONS.arrow}</button>
        </form>
        <form id="form-direct" class="form hidden" autocomplete="off">
          <div class="field"><label for="d-label">Name</label><input class="input" id="d-label" name="label" placeholder="Rent, donation, savings…" maxlength="60"></div>
          <div class="field"><label for="d-address">Shielded address</label><input class="input mono-in" id="d-address" name="address" placeholder="u1…  or  zs1…" required spellcheck="false">
            <span class="hint">The payee needs nothing but an address. Transparent addresses are refused.</span></div>
          <div class="row2">
            <div class="field"><label for="d-amount">Amount (ZEC)</label><input class="input num" id="d-amount" name="amount" inputmode="decimal" placeholder="0.5" required></div>
            <div class="field"><label for="d-every">Every (days)</label><input class="input num" id="d-every" name="everyDays" inputmode="decimal" value="30" required></div>
          </div>
          <div class="field"><label for="d-cycles">Number of payments</label><input class="input num" id="d-cycles" name="cycles" inputmode="numeric" value="12" required></div>
          <button class="btn primary block" type="submit">Review limits ${ICONS.arrow}</button>
        </form>
        <p id="form-error" class="error" role="alert"></p>
      </section>

      <section class="card pad" aria-labelledby="act-title">
        <h2 id="act-title">Activity</h2>
        <ol id="activity" class="timeline"></ol>
      </section>

      <section class="card pad privacy">
        <div class="privacy-row">${ICONS.shield}<div><strong>Private by construction</strong><p class="muted small">Payments go shielded-to-shielded. On chain, nobody sees who paid, who was paid, or how much. Only the fee is public.</p></div></div>
        <div class="privacy-row">${ICONS.key}<div><strong>Your keys stay here</strong><p class="muted small">Merchants never get permission to spend. This app pays only what you approved, and refuses anything else.</p></div></div>
      </section>
    </aside>
  </div>
</main>

<div id="sheet" class="sheet hidden" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
  <div class="sheet-card">
    <p class="eyebrow">Review and approve</p>
    <div class="sheet-who"><span class="avatar" id="sheet-avatar"></span><div><h2 id="sheet-title"></h2><p id="sheet-payee" class="mono muted"></p></div></div>
    <div class="sheet-amount"><strong id="sheet-amount" class="num"></strong><span id="sheet-every" class="muted"></span></div>
    <div class="sheet-cols">
      <div><p class="eyebrow">You allow</p><ul id="sheet-limits" class="list ok"></ul></div>
      <div><p class="eyebrow">They can never</p><ul class="list no">
        <li>${ICONS.x}<span>Charge more, earlier, or more often</span></li>
        <li>${ICONS.x}<span>See your balance or other payments</span></li>
        <li>${ICONS.x}<span>Take anything after you revoke</span></li>
      </ul></div>
    </div>
    <p id="sheet-error" class="error" role="alert"></p>
    <div class="sheet-actions">
      <button id="sheet-cancel" class="btn">Cancel</button>
      <button id="sheet-approve" class="btn gold lg">${ICONS.check} Approve</button>
    </div>
  </div>
</div>
<script src="/app.js"></script>
</body>
</html>`;

export const APP_CSS = `${THEME_CSS}
.small{font-size:13px}
.band-right{display:flex;align-items:center;gap:18px}
.bal{display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}
.bal-label{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--band-muted)}.bal-label .ico{width:13px;height:13px}
.bal strong{font-size:18px;letter-spacing:-.01em}
.banner{background:var(--bad-soft);padding:10px 14px;border-radius:10px;margin-bottom:16px}

.hero{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:14px;margin-bottom:30px}
@media (max-width:1000px){.hero{grid-template-columns:1fr 1fr}.hero .next{grid-column:1/-1}}
.stat{display:flex;flex-direction:column;gap:2px}.stat strong{font-size:26px;letter-spacing:-.02em;margin-top:4px}
.next{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,var(--surface),var(--gold-soft))}
.next .avatar{width:48px;height:48px;font-size:19px;border-radius:14px;background:var(--surface);border:1px solid var(--line)}
.next-main{flex:1;min-width:0}.next-main h2{font-size:18px;margin-top:2px}
.next-when{text-align:right}.next-when strong{display:block;font-size:26px;letter-spacing:-.02em}

.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start}
@media (max-width:980px){.layout{grid-template-columns:1fr}}
.section-head{margin-bottom:16px}.section-head h1{font-size:24px}.section-head p{margin-top:4px}
.subs{display:flex;flex-direction:column;gap:14px}
.group{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:16px 0 0;font-weight:650}

.sub{padding:20px 22px}
.sub-top{display:flex;gap:14px;align-items:flex-start}
.sub-name{flex:1;min-width:0}.sub-name h3{font-size:17px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sub-name p{margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sub-amt{text-align:right}.sub-amt strong{display:block;font-size:22px;letter-spacing:-.02em}
.sub-progress{margin:18px 0 6px}
.sub-progress-row{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:8px}
.sub-progress-row b{color:var(--ink);font-weight:600}
.sub-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;flex-wrap:wrap}
.sub-next{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2)}
.sub-next .ico{color:var(--gold)}
.sub-actions{display:flex;gap:8px}
.sub.done{box-shadow:none;background:transparent}.sub.done .sub-progress{display:none}
.note{margin-top:14px;padding:11px 13px;border-radius:10px;font-size:13.5px;background:var(--warn-soft);color:var(--warn)}
.details{margin-top:16px;padding-top:16px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media (max-width:620px){.details{grid-template-columns:1fr}}
.details .eyebrow{margin-bottom:8px}
.paylist{list-style:none;margin:0;padding:0;font-size:13px}
.paylist li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)}
.paylist li:first-child{border-top:0}
.mid{grid-column:1/-1;font-size:12px;color:var(--faint);word-break:break-all}

.side{display:flex;flex-direction:column;gap:18px}
.side h2{font-size:16px}
.add-lead{margin:4px 0 14px}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:var(--soft);padding:4px;border-radius:11px;margin-bottom:16px}
.seg-btn{font:inherit;font-size:13px;font-weight:600;border:0;background:none;color:var(--muted);padding:8px;border-radius:8px;cursor:pointer}
.seg-btn.active{background:var(--raised);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.form{display:flex;flex-direction:column;gap:14px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mono-in{font-family:var(--mono);font-size:13px}
#form-error{margin-top:10px}

.timeline{list-style:none;margin:12px 0 0;padding:0;max-height:380px;overflow:auto}
.timeline li{position:relative;padding:0 0 14px 22px;font-size:13.5px}
.timeline li::before{content:"";position:absolute;left:5px;top:16px;bottom:-2px;width:1px;background:var(--line)}
.timeline li:last-child::before{display:none}
.dot{position:absolute;left:0;top:5px;width:11px;height:11px;border-radius:50%;border:2px solid var(--surface);background:var(--line-2);box-shadow:0 0 0 1px var(--line-2)}
.dot.paid{background:var(--ok);box-shadow:0 0 0 1px var(--ok)}.dot.subscribe{background:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.dot.refused,.dot.send-error{background:var(--bad);box-shadow:0 0 0 1px var(--bad)}.dot.preflight-failed,.dot.invoice-unavailable{background:var(--warn);box-shadow:0 0 0 1px var(--warn)}
.timeline .t{color:var(--muted);font-size:12px;margin-top:1px}

.privacy{display:flex;flex-direction:column;gap:14px;background:var(--soft);box-shadow:none}
.privacy-row{display:flex;gap:12px}.privacy-row .ico{color:var(--gold);margin-top:2px}
.privacy strong{font-size:14px}

.sheet{position:fixed;inset:0;background:rgba(10,9,7,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:20}
.sheet-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;max-width:560px;width:100%;padding:28px;box-shadow:var(--shadow-l)}
.sheet-who{display:flex;gap:14px;align-items:center;margin-top:12px}.sheet-who h2{font-size:22px}
.sheet-amount{display:flex;align-items:baseline;gap:10px;margin:22px 0 18px;padding:16px 18px;border-radius:14px;background:var(--soft);flex-wrap:wrap}
.sheet-amount strong{font-size:34px;letter-spacing:-.025em}
.sheet-cols{display:grid;grid-template-columns:1.25fr 1fr;gap:20px}
@media (max-width:560px){.sheet-cols{grid-template-columns:1fr}}
.list{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:9px;font-size:13.5px}
.list li{display:flex;gap:9px;align-items:flex-start}.list .ico{width:16px;height:16px;margin-top:2px}
.list.ok .ico{color:var(--ok)}.list.no .ico{color:var(--bad)}
.sheet-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}
#sheet-error{margin-top:12px}
`;

export const APP_JS = `"use strict";
(() => {
  const ICON = ${JSON.stringify({ check: ICONS.check, clock: ICONS.clock })};
  const startParams = new URLSearchParams(location.search);
  const hashToken = new URLSearchParams(location.hash.slice(1)).get("t");
  try { if (hashToken) localStorage.setItem("cadence-token", hashToken); } catch {}
  if (hashToken || location.search) history.replaceState(null, "", "/");
  let token = hashToken || "";
  try { token = token || localStorage.getItem("cadence-token") || ""; } catch {}

  const $ = (id) => document.getElementById(id);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "icon") el.insertAdjacentHTML("afterbegin", ICON[v]);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }

  async function api(path, body) {
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "x-cadence-token": token, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ("request failed: " + r.status));
    return data;
  }

  let serverOffset = 0;
  const nowSec = () => Math.floor(Date.now() / 1000) + serverOffset;
  function rel(t) {
    const d = t - nowSec(), a = Math.abs(d);
    const s = a < 60 ? a + "s" : a < 3600 ? Math.round(a / 60) + "m" : a < 86400 ? Math.round(a / 3600) + "h" : Math.round(a / 86400) + "d";
    return d >= 0 ? "in " + s : s + " ago";
  }
  const short = (s, n = 10) => (s && s.length > 2 * n + 1 ? s.slice(0, n) + "…" + s.slice(-6) : s || "");
  const host = (u) => { try { return new URL(u).host; } catch { return u; } };
  const initial = (s) => (s || "?").trim().charAt(0).toUpperCase();
  const zec = (n) => { const v = (+n).toFixed(8).replace(/0+$/, "").replace(/\\.$/, ""); return v || "0"; };
  const STATUS = { active: ["Active", "ok"], complete: ["Complete", ""], revoked: ["Revoked", ""], expired: ["Ended", ""], attention: ["Needs attention", "warn"] };

  const armed = new Set();
  const open = new Set();
  let last = null;

  function subCard(s, activity) {
    const [stLabel, stClass] = STATUS[s.status] || [s.status, ""];
    const running = s.status === "active" || s.status === "attention";
    const next = s.nextSendAt || s.nextDueAt;
    const payee = s.mode === "merchant" ? host(s.payee) : short(s.payee, 12);
    const actions = [];
    actions.push(h("button", { class: "btn ghost", onclick: () => { open.has(s.id) ? open.delete(s.id) : open.add(s.id); render(last); }, "aria-expanded": String(open.has(s.id)) }, open.has(s.id) ? "Hide details" : "Details"));
    if (s.pending) {
      actions.push(h("button", { class: "btn", onclick: () => resolve(s.id, "paid") }, "It went through"));
      actions.push(h("button", { class: "btn", onclick: () => resolve(s.id, "not-paid") }, "It did not go out"));
    }
    if (running) actions.push(h("button", { class: "btn danger" + (armed.has(s.id) ? " armed" : ""), onclick: () => revoke(s.id) }, armed.has(s.id) ? "Confirm revoke" : "Revoke"));

    let note = null;
    if (s.pending) note = h("div", { class: "note" }, "Payment " + s.pending.cycle + " was started but not confirmed. Check your wallet, then tell Cadence what happened. Nothing else is paid until then.");
    else if (s.status === "attention" && s.lastResult) note = h("div", { class: "note" }, (s.lastResult.action === "refused" ? "Refused: " : "Not sent: ") + s.lastResult.detail);

    let details = null;
    if (open.has(s.id)) {
      const pays = activity.filter((e) => e.mandateId === s.id && e.event === "paid");
      details = h("div", { class: "details" },
        h("div", {}, h("p", { class: "eyebrow" }, "Limits you approved"), h("ul", { class: "list ok" }, s.limits.map((l) => h("li", { icon: "check" }, h("span", {}, l))))),
        h("div", {}, h("p", { class: "eyebrow" }, "Payments"),
          pays.length ? h("ul", { class: "paylist" }, pays.map((p) => h("li", {}, h("span", {}, "Payment " + p.cycle + " · " + rel(p.at)), h("span", { class: "mono muted", title: p.txid }, short(p.txid, 8)))))
            : h("p", { class: "muted small" }, "None yet."),
          s.mode === "merchant" ? h("p", { class: "muted small", style: "margin-top:10px" }, "Every payment went to a fresh shielded address issued by the merchant.") : null),
        h("p", { class: "mid mono" }, "Mandate " + s.id));
    }

    return h("article", { class: "card sub" + (running ? "" : " done") },
      h("div", { class: "sub-top" },
        h("span", { class: "avatar" }, initial(s.label)),
        h("div", { class: "sub-name" },
          h("h3", {}, s.label, h("span", { class: "chip " + stClass }, stLabel)),
          h("p", { class: "muted small", title: s.payee }, payee)),
        h("div", { class: "sub-amt" }, h("strong", { class: "num" }, s.amount + " ZEC"), h("span", { class: "muted small" }, "every " + s.every))),
      h("div", { class: "sub-progress" },
        h("div", { class: "sub-progress-row" },
          h("span", {}, h("b", {}, s.cyclesPaid + " of " + s.maxCycles), " payments"),
          h("span", { class: "num" }, h("b", {}, s.paid), " of " + s.cap + " ZEC approved")),
        h("div", { class: "meter", role: "progressbar", "aria-valuenow": s.capUsedPct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Share of the approved total paid" },
          h("span", { style: "width:" + Math.min(100, s.capUsedPct) + "%" }))),
      note,
      h("div", { class: "sub-foot" },
        running && next ? h("span", { class: "sub-next", icon: "clock" }, next <= nowSec() ? "Paying now" : "Next payment " + rel(next)) : h("span", { class: "muted small" }, s.status === "complete" ? "All " + s.maxCycles + " payments made" : stLabel),
        h("div", { class: "sub-actions" }, actions)),
      details);
  }

  const EVENTS = {
    subscribe: (e) => "Approved " + e.label,
    sending: (e) => "Sending payment " + e.cycle + " · " + e.label,
    paid: (e) => "Paid " + e.label + " · payment " + e.cycle,
    refused: (e) => "Refused " + e.label + ": " + e.detail,
    "send-error": (e) => "Send error · " + e.label + ": " + e.detail,
    "preflight-failed": (e) => "Not sent · " + e.label + ": " + e.detail,
    "invoice-unavailable": (e) => "No invoice from " + e.label + ": " + e.detail,
    revoke: (e) => "Revoked " + e.label,
    "resolve-pending": (e) => "Resolved payment " + e.cycle + " · " + e.label,
  };

  function render(state) {
    if (!state) return;
    serverOffset = state.now - Math.floor(Date.now() / 1000);
    $("network").textContent = state.network;
    $("balance").textContent = state.balance ? state.balance.shielded + " ZEC" : state.balanceError ? "unavailable" : "…";
    $("balance").title = state.balanceError || "";

    const subs = state.subscriptions;
    const running = subs.filter((x) => x.status === "active" || x.status === "attention");
    $("s-running").textContent = running.length;
    $("s-remaining").textContent = zec(running.reduce((a, x) => a + (+x.cap - +x.paid), 0));
    $("s-paid").textContent = zec(subs.reduce((a, x) => a + +x.paid, 0));

    const upcoming = running.filter((x) => x.nextSendAt || x.nextDueAt).sort((a, b) => (a.nextSendAt || a.nextDueAt) - (b.nextSendAt || b.nextDueAt))[0];
    const next = $("next");
    if (upcoming) {
      const t = upcoming.nextSendAt || upcoming.nextDueAt;
      next.replaceChildren(h("span", { class: "avatar" }, initial(upcoming.label)),
        h("div", { class: "next-main" }, h("span", { class: "eyebrow" }, "Next payment"), h("h2", {}, upcoming.label), h("span", { class: "muted small" }, upcoming.amount + " ZEC · shielded")),
        h("div", { class: "next-when" }, h("strong", { class: "num" }, t <= nowSec() ? "now" : rel(t).replace("in ", "")), h("span", { class: "muted small" }, t <= nowSec() ? "sending" : "from now")));
    } else {
      next.replaceChildren(h("div", { class: "next-main" }, h("span", { class: "eyebrow" }, "Next payment"), h("h2", {}, "Nothing scheduled"), h("span", { class: "muted small" }, "Add a subscription to start.")));
    }

    const FINISHED = new Set(["complete", "revoked", "expired"]);
    const current = subs.filter((x) => !FINISHED.has(x.status));
    const finished = subs.filter((x) => FINISHED.has(x.status));
    const nodes = current.length ? current.map((x) => subCard(x, state.activity))
      : [h("div", { class: "empty" }, h("strong", {}, "No running subscriptions"), h("p", { class: "small", style: "margin-top:6px" }, "Open a merchant's checkout page, or set up autopay to any shielded address."))];
    if (finished.length) nodes.push(h("h2", { class: "group" }, "Finished · " + finished.length), ...finished.map((x) => subCard(x, state.activity)));
    $("subs").replaceChildren(...nodes);

    $("activity").replaceChildren(...(state.activity.length ? state.activity.slice(0, 40).map((e) =>
      h("li", {}, h("span", { class: "dot " + e.event }), h("div", {}, (EVENTS[e.event] || ((x) => x.event + " " + x.label))(e)),
        h("div", { class: "t" }, rel(e.at), e.txid ? h("span", { class: "mono", title: e.txid }, " · " + short(e.txid, 8)) : null)))
      : [h("li", { class: "muted small" }, "Nothing yet.")]));
  }

  async function refresh() {
    try {
      last = await api("/api/state");
      render(last);
      $("top-error").classList.add("hidden");
    } catch (e) {
      const el = $("top-error");
      el.textContent = token ? e.message : "Open Cadence with the link printed in your terminal; it carries this session's key.";
      el.classList.remove("hidden");
    }
  }

  async function revoke(id) {
    if (!armed.has(id)) { armed.add(id); render(last); setTimeout(() => { armed.delete(id); render(last); }, 4000); return; }
    armed.delete(id);
    try { await api("/api/revoke", { mandateId: id }); } catch (e) { $("form-error").textContent = e.message; }
    refresh();
  }
  async function resolve(id, outcome) {
    try { await api("/api/resolve", { mandateId: id, outcome }); } catch (e) { $("form-error").textContent = e.message; }
    refresh();
  }

  for (const tab of document.querySelectorAll(".seg-btn")) {
    tab.addEventListener("click", () => {
      for (const t of document.querySelectorAll(".seg-btn")) { const on = t === tab; t.classList.toggle("active", on); t.setAttribute("aria-selected", String(on)); }
      $("form-offer").classList.toggle("hidden", tab.dataset.tab !== "offer");
      $("form-direct").classList.toggle("hidden", tab.dataset.tab !== "direct");
      $("form-error").textContent = "";
    });
  }

  let preview = null;
  function openSheet(p) {
    preview = p;
    $("sheet-avatar").textContent = initial(p.label);
    $("sheet-title").textContent = p.label;
    $("sheet-payee").textContent = p.mode === "merchant" ? host(p.payee) : short(p.payee, 18);
    $("sheet-amount").textContent = p.amount + " ZEC";
    $("sheet-every").textContent = "every " + p.every + " · up to " + p.maxCycles + " times";
    $("sheet-limits").replaceChildren(...p.limits.map((l) => h("li", { icon: "check" }, h("span", {}, l))));
    $("sheet-error").textContent = "";
    $("sheet-approve").disabled = false;
    $("sheet").classList.remove("hidden");
    $("sheet-approve").focus();
  }
  const closeSheet = () => { preview = null; $("sheet").classList.add("hidden"); };
  $("sheet-cancel").addEventListener("click", closeSheet);
  $("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) closeSheet(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && preview) closeSheet(); });
  $("sheet-approve").addEventListener("click", async () => {
    if (!preview) return;
    $("sheet-approve").disabled = true;
    try { await api("/api/approve", { previewId: preview.previewId }); closeSheet(); document.querySelectorAll("form").forEach((f) => f.reset()); refresh(); }
    catch (e) { $("sheet-error").textContent = e.message; $("sheet-approve").disabled = false; }
  });

  async function submit(form, path) {
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; $("form-error").textContent = "";
    try { openSheet(await api(path, Object.fromEntries(new FormData(form)))); }
    catch (e) { $("form-error").textContent = e.message; }
    finally { btn.disabled = false; }
  }
  $("form-offer").addEventListener("submit", (e) => { e.preventDefault(); submit(e.target, "/api/preview/offer"); });
  $("form-direct").addEventListener("submit", (e) => { e.preventDefault(); submit(e.target, "/api/preview/direct"); });

  // Opened from a merchant's checkout button: go straight to the approval sheet.
  if (startParams.get("offer")) {
    $("offerUrl").value = startParams.get("offer");
    if (token) submit($("form-offer"), "/api/preview/offer");
  }

  refresh();
  setInterval(refresh, 3000);
})();
`;
