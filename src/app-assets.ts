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
<header class="bar">
  <div class="brand"><span class="mark" aria-hidden="true"></span>Cadence</div>
  <div class="bar-right">
    <span id="network" class="pill"></span>
    <div class="balance"><span class="muted">Shielded balance</span><strong id="balance">…</strong></div>
  </div>
</header>
<main class="layout">
  <section class="col-main">
    <div class="section-head">
      <h1>Your subscriptions</h1>
      <p class="muted">Each one can only take what you approved. Revoke stops it at once.</p>
    </div>
    <div id="subs" class="subs"></div>
  </section>
  <aside class="col-side">
    <section class="panel" id="add">
      <h2>Add a subscription</h2>
      <div class="tabs" role="tablist">
        <button role="tab" class="tab active" data-tab="offer" aria-selected="true">Merchant link</button>
        <button role="tab" class="tab" data-tab="direct" aria-selected="false">Pay an address</button>
      </div>
      <form id="form-offer" class="form" autocomplete="off">
        <label>Subscription link<input name="offerUrl" placeholder="https://shop.example/offer/plan" required></label>
        <label>Payments to allow <span class="muted">(blank = plan maximum)</span><input name="cycles" inputmode="numeric" pattern="[0-9]*"></label>
        <button class="btn primary" type="submit">Review</button>
      </form>
      <form id="form-direct" class="form hidden" autocomplete="off">
        <label>Name<input name="label" placeholder="Rent, donation, …" maxlength="60"></label>
        <label>Shielded address<input name="address" placeholder="u1… or zs1…" required spellcheck="false"></label>
        <div class="row">
          <label>Amount (ZEC)<input name="amount" inputmode="decimal" placeholder="0.5" required></label>
          <label>Every (days)<input name="everyDays" inputmode="decimal" value="30" required></label>
        </div>
        <label>Number of payments<input name="cycles" inputmode="numeric" value="12" required></label>
        <button class="btn primary" type="submit">Review</button>
      </form>
      <p id="form-error" class="error" role="alert"></p>
    </section>
    <section class="panel">
      <h2>Activity</h2>
      <ol id="activity" class="activity"></ol>
    </section>
  </aside>
</main>
<div id="sheet" class="sheet hidden" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
  <div class="sheet-card">
    <p class="eyebrow">Approve a mandate</p>
    <h2 id="sheet-title"></h2>
    <p id="sheet-payee" class="mono muted"></p>
    <div class="sheet-amount"><strong id="sheet-amount"></strong><span id="sheet-every" class="muted"></span></div>
    <ul id="sheet-limits" class="limits"></ul>
    <p class="muted small">Your wallet keys stay on this computer. The payee never gets permission to spend; the agent pays only what is listed here.</p>
    <p id="sheet-error" class="error" role="alert"></p>
    <div class="sheet-actions">
      <button id="sheet-cancel" class="btn">Cancel</button>
      <button id="sheet-approve" class="btn primary">Approve</button>
    </div>
  </div>
</div>
<script src="/app.js"></script>
</body>
</html>`;

export const APP_CSS = `:root{
  --bg:#f7f5f0;--surface:#fffefb;--ink:#1d1b17;--muted:#6c675d;--line:#e4dfd3;--soft:#efebe2;
  --accent:#b07a12;--accent-ink:#1d1b17;--accent-bg:#f6e7c4;
  --ok:#1e7a4c;--ok-bg:#e1f1e7;--warn:#9a5b00;--warn-bg:#f8ead2;--bad:#b3261e;--bad-bg:#f7e1df;
  --radius:14px;--shadow:0 1px 2px rgba(29,27,23,.05),0 4px 16px rgba(29,27,23,.05);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#13120f;--surface:#1c1a16;--ink:#efece4;--muted:#a19b8f;--line:#2f2c26;--soft:#25221d;
  --accent:#e6b247;--accent-ink:#1a1710;--accent-bg:#3a2f17;
  --ok:#6cc995;--ok-bg:#183424;--warn:#e7ac55;--warn-bg:#3a2b14;--bad:#f07a71;--bad-bg:#3d1c19;
  --shadow:none;
}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2{margin:0;letter-spacing:-.01em}h1{font-size:22px}h2{font-size:16px;margin-bottom:12px}
p{margin:0}.muted{color:var(--muted)}.small{font-size:13px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;word-break:break-all}
.hidden{display:none!important}
.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 24px;border-bottom:1px solid var(--line);background:var(--surface);position:sticky;top:0;z-index:2}
.brand{display:flex;align-items:center;gap:10px;font-weight:650;font-size:17px}
.mark{width:22px;height:22px;border-radius:50%;background:conic-gradient(var(--accent) 0 75%,var(--line) 75% 100%);box-shadow:inset 0 0 0 5px var(--surface)}
.bar-right{display:flex;align-items:center;gap:18px}
.balance{display:flex;flex-direction:column;align-items:flex-end;line-height:1.25}.balance span{font-size:12px}
.balance strong{font-variant-numeric:tabular-nums;font-size:16px}
.pill{font-size:12px;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;max-width:1120px;margin:0 auto;padding:28px 24px 64px}
@media (max-width:880px){.layout{grid-template-columns:1fr;padding:20px 16px 48px}.bar{padding:12px 16px}}
.section-head{margin-bottom:16px}.section-head p{margin-top:4px}
.subs{display:flex;flex-direction:column;gap:14px}
.card,.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.panel{padding:18px;margin-bottom:18px}
.card{padding:18px 20px}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.card h3{margin:0;font-size:17px}.card .payee{margin-top:2px}
.amount{font-variant-numeric:tabular-nums;text-align:right}.amount strong{font-size:20px;display:block}
.chip{display:inline-block;font-size:12px;font-weight:550;padding:2px 9px;border-radius:999px;margin-top:6px}
.chip.active{background:var(--ok-bg);color:var(--ok)}.chip.complete{background:var(--soft);color:var(--muted)}
.chip.revoked,.chip.expired{background:var(--soft);color:var(--muted)}.chip.attention{background:var(--warn-bg);color:var(--warn)}
.meter{height:8px;border-radius:999px;background:var(--soft);overflow:hidden;margin:16px 0 8px}
.meter span{display:block;height:100%;background:var(--accent);border-radius:999px;transition:width .4s}
.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;font-size:13px}
.facts b{display:block;font-size:14px;font-variant-numeric:tabular-nums}
@media (max-width:520px){.facts{grid-template-columns:1fr 1fr}}
.note{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:13px}
.note.warn{background:var(--warn-bg);color:var(--warn)}
.card-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.btn{font:inherit;font-size:14px;font-weight:550;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.btn:hover{background:var(--soft)}.btn:focus-visible,input:focus-visible,.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.btn.primary:hover{filter:brightness(1.05)}
.btn.danger{color:var(--bad);border-color:var(--bad-bg)}.btn.danger.confirm{background:var(--bad);color:#fff;border-color:var(--bad)}
.btn[disabled]{opacity:.55;cursor:default}
.group{font-size:14px;color:var(--muted);margin:14px 0 0;font-weight:600}
.card.done{opacity:.72}.card.done .meter{display:none}
.empty{padding:32px 20px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:var(--radius)}
.tabs{display:flex;gap:4px;background:var(--soft);padding:4px;border-radius:10px;margin-bottom:14px}
.tab{flex:1;font:inherit;font-size:13px;font-weight:550;border:0;background:none;color:var(--muted);padding:7px;border-radius:7px;cursor:pointer}
.tab.active{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
.form{display:flex;flex-direction:column;gap:12px}
.form label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:550}
.form input{font:inherit;font-weight:400;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);min-width:0}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.error{color:var(--bad);font-size:13px;margin-top:10px;min-height:1px}
.activity{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;max-height:420px;overflow:auto}
.activity li{display:grid;grid-template-columns:10px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px}
.activity li:last-child{border-bottom:0}
.dot{width:8px;height:8px;border-radius:50%;margin-top:6px;background:var(--line)}
.dot.paid{background:var(--ok)}.dot.refused,.dot.send-error{background:var(--bad)}.dot.preflight-failed,.dot.invoice-unavailable{background:var(--warn)}.dot.subscribe{background:var(--accent)}
.activity .t{color:var(--muted);font-size:12px}
.sheet{position:fixed;inset:0;background:rgba(19,18,15,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10}
.sheet-card{background:var(--surface);border-radius:18px;max-width:460px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:650;margin-bottom:6px}
.sheet-card h2{font-size:22px;margin-bottom:4px}
.sheet-amount{display:flex;align-items:baseline;gap:8px;margin:16px 0 8px}.sheet-amount strong{font-size:28px;font-variant-numeric:tabular-nums}
.limits{list-style:none;padding:0;margin:8px 0 14px;display:flex;flex-direction:column;gap:8px}
.limits li{position:relative;padding-left:24px}
.limits li::before{content:"";position:absolute;left:2px;top:6px;width:12px;height:7px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);transform:rotate(-45deg)}
.sheet-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
`;

export const APP_JS = `"use strict";
(() => {
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
  const STATUS = { active: "Active", complete: "Complete", revoked: "Revoked", expired: "Ended", attention: "Needs attention" };

  const armed = new Set();
  function subCard(s) {
    const next = s.nextSendAt || s.nextDueAt;
    const nextText = s.status === "active" && next ? (next <= nowSec() ? "sending now" : rel(next)) : "—";
    const actions = [];
    if (s.pending) {
      actions.push(h("button", { class: "btn", onclick: () => resolve(s.id, "paid") }, "It went through"));
      actions.push(h("button", { class: "btn", onclick: () => resolve(s.id, "not-paid") }, "It did not go out"));
    }
    if (s.status !== "revoked" && s.status !== "complete" && s.status !== "expired") {
      const isArmed = armed.has(s.id);
      actions.push(h("button", { class: "btn danger" + (isArmed ? " confirm" : ""), onclick: () => revoke(s.id) }, isArmed ? "Confirm revoke" : "Revoke"));
    }
    let note = null;
    if (s.pending) note = h("div", { class: "note warn" }, "A payment for cycle " + s.pending.cycle + " was started but not confirmed. Check your wallet, then tell Cadence what happened. Nothing else will be paid until then.");
    else if (s.lastResult && (s.lastResult.action === "refused" || s.lastResult.action === "failed") && s.status === "attention")
      note = h("div", { class: "note warn" }, (s.lastResult.action === "refused" ? "Refused: " : "Not sent: ") + s.lastResult.detail);
    return h("article", { class: "card" },
      h("div", { class: "card-top" },
        h("div", {},
          h("h3", {}, s.label),
          h("p", { class: "payee mono muted", title: s.payee }, s.mode === "merchant" ? s.payee : short(s.payee, 14)),
          h("span", { class: "chip " + s.status }, STATUS[s.status] || s.status)),
        h("div", { class: "amount" }, h("strong", {}, s.amount + " ZEC"), h("span", { class: "muted small" }, "every " + s.every))),
      h("div", { class: "meter", role: "progressbar", "aria-valuenow": s.capUsedPct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Share of the approved total already paid" },
        h("span", { style: "width:" + Math.min(100, s.capUsedPct) + "%" })),
      h("div", { class: "facts" },
        h("div", {}, h("b", {}, s.cyclesPaid + " of " + s.maxCycles), h("span", { class: "muted" }, "payments made")),
        h("div", {}, h("b", {}, s.paid + " / " + s.cap), h("span", { class: "muted" }, "ZEC of approved total")),
        h("div", {}, h("b", {}, nextText), h("span", { class: "muted" }, "next payment"))),
      note,
      actions.length ? h("div", { class: "card-actions" }, actions) : null);
  }

  const EVENTS = {
    subscribe: (e) => "Approved " + e.label,
    sending: (e) => "Sending " + e.label + " · payment " + e.cycle,
    paid: (e) => "Paid " + e.label + " · payment " + e.cycle,
    refused: (e) => "Refused " + e.label + ": " + e.detail,
    "send-error": (e) => "Send error for " + e.label + ": " + e.detail,
    "preflight-failed": (e) => "Not sent (" + e.label + "): " + e.detail,
    "invoice-unavailable": (e) => "No invoice from " + e.label + ": " + e.detail,
    revoke: (e) => "Revoked " + e.label,
    "resolve-pending": (e) => "Resolved payment " + e.cycle + " of " + e.label,
  };
  function activityItem(e) {
    const text = (EVENTS[e.event] || ((x) => x.event + " " + x.label))(e);
    return h("li", {}, h("span", { class: "dot " + e.event }),
      h("div", {}, h("div", {}, text), h("div", { class: "t" }, rel(e.at), e.txid ? h("span", { class: "mono", title: e.txid }, " · tx " + short(e.txid, 8)) : null)));
  }

  function render(state) {
    serverOffset = state.now - Math.floor(Date.now() / 1000);
    $("network").textContent = state.network;
    $("balance").textContent = state.balance ? state.balance.shielded + " ZEC" : state.balanceError ? "unavailable" : "…";
    $("balance").title = state.balanceError || "";
    const subs = $("subs");
    const FINISHED = new Set(["complete", "revoked", "expired"]);
    const current = state.subscriptions.filter((x) => !FINISHED.has(x.status));
    const finished = state.subscriptions.filter((x) => FINISHED.has(x.status));
    const nodes = current.length ? current.map(subCard)
      : [h("div", { class: "empty" }, "No running subscriptions. Paste a merchant's subscription link, or set up autopay to any shielded address.")];
    if (finished.length) nodes.push(h("h2", { class: "group" }, "Finished (" + finished.length + ")"), ...finished.map((x) => { const c = subCard(x); c.classList.add("done"); return c; }));
    subs.replaceChildren(...nodes);
    const act = $("activity");
    act.replaceChildren(...(state.activity.length ? state.activity.map(activityItem) : [h("li", {}, h("span", {}), h("div", { class: "muted" }, "Nothing yet."))]));
  }

  let last = null;
  async function refresh() {
    try { last = await api("/api/state"); render(last); $("form-error").textContent = ""; }
    catch (e) { $("form-error").textContent = token ? e.message : "Open the app with the link printed in your terminal."; }
  }

  async function revoke(id) {
    if (!armed.has(id)) { armed.add(id); if (last) render(last); setTimeout(() => { armed.delete(id); if (last) render(last); }, 4000); return; }
    armed.delete(id);
    try { await api("/api/revoke", { mandateId: id }); } catch (e) { alertError(e); }
    refresh();
  }
  async function resolve(id, outcome) {
    try { await api("/api/resolve", { mandateId: id, outcome }); } catch (e) { alertError(e); }
    refresh();
  }
  const alertError = (e) => { $("form-error").textContent = e.message; };

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
      for (const t of document.querySelectorAll(".tab")) { const on = t === tab; t.classList.toggle("active", on); t.setAttribute("aria-selected", String(on)); }
      $("form-offer").classList.toggle("hidden", tab.dataset.tab !== "offer");
      $("form-direct").classList.toggle("hidden", tab.dataset.tab !== "direct");
      $("form-error").textContent = "";
    });
  }

  let preview = null;
  function openSheet(p) {
    preview = p;
    $("sheet-title").textContent = p.label;
    $("sheet-payee").textContent = p.mode === "merchant" ? p.payee : short(p.payee, 18);
    $("sheet-amount").textContent = p.amount + " ZEC";
    $("sheet-every").textContent = "every " + p.every;
    $("sheet-limits").replaceChildren(...p.limits.map((l) => h("li", {}, l)));
    $("sheet-error").textContent = "";
    $("sheet-approve").disabled = false;
    $("sheet").classList.remove("hidden");
    $("sheet-approve").focus();
  }
  const closeSheet = () => { preview = null; $("sheet").classList.add("hidden"); };
  $("sheet-cancel").addEventListener("click", closeSheet);
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

  if (startParams.get("offer")) $("form-offer").offerUrl.value = startParams.get("offer");

  refresh();
  setInterval(refresh, 3000);
})();
`;
