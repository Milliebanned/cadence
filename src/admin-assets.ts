export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Cadence merchant</title>
<style>
:root{
  --bg:#f7f5f0;--surface:#fffefb;--ink:#1d1b17;--muted:#6c675d;--line:#e4dfd3;--soft:#efebe2;--grid:#ece8de;
  --accent:#b07a12;--chart:#b07a12;--ok:#1e7a4c;--ok-bg:#e1f1e7;--warn:#9a5b00;--warn-bg:#f8ead2;--bad:#b3261e;--bad-bg:#f7e1df;
  --radius:14px;--shadow:0 1px 2px rgba(29,27,23,.05),0 4px 16px rgba(29,27,23,.05);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#13120f;--surface:#1c1a16;--ink:#efece4;--muted:#a19b8f;--line:#2f2c26;--soft:#25221d;--grid:#2a2722;
  --accent:#e6b247;--chart:#b8832a;--ok:#6cc995;--ok-bg:#183424;--warn:#e7ac55;--warn-bg:#3a2b14;--bad:#f07a71;--bad-bg:#3d1c19;--shadow:none;
}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:14.5px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1{font-size:20px;margin:0}h2{font-size:15px;margin:0 0 12px}p{margin:0}
.muted{color:var(--muted)}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid var(--line);background:var(--surface)}
.brand{display:flex;align-items:center;gap:10px;font-weight:650}.brand small{font-weight:400;color:var(--muted)}
.mark{width:20px;height:20px;border-radius:50%;background:conic-gradient(var(--accent) 0 75%,var(--line) 75% 100%);box-shadow:inset 0 0 0 4px var(--surface)}
.badges{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.badge{font-size:12px;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--muted);display:inline-flex;gap:6px;align-items:center}
.badge.ok{background:var(--ok-bg);color:var(--ok)}.badge.warn{background:var(--warn-bg);color:var(--warn)}
.wrap{max-width:1180px;margin:0 auto;padding:24px 24px 64px;display:flex;flex-direction:column;gap:18px}
@media (max-width:720px){.wrap{padding:16px 16px 48px}.bar{padding:12px 16px}}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media (max-width:820px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi,.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.kpi{padding:14px 16px}.kpi span{font-size:12.5px;color:var(--muted)}.kpi strong{display:block;font-size:24px;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.kpi small{color:var(--muted);font-size:12px}
.panel{padding:18px}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
@media (max-width:900px){.grid2{grid-template-columns:1fr}}
.chart{position:relative}
.chart svg{display:block;width:100%;height:220px;overflow:visible}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--bg);font-size:12.5px;padding:6px 9px;border-radius:8px;white-space:nowrap;transform:translate(-50%,-110%);opacity:0;transition:opacity .1s}
.tip.on{opacity:1}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-size:12px;font-weight:550;color:var(--muted)}tr:last-child td{border-bottom:0}
td.num,th.num{text-align:right}
.scroll{overflow-x:auto}
.chip{display:inline-block;font-size:12px;font-weight:550;padding:1px 8px;border-radius:999px}
.chip.active{background:var(--ok-bg);color:var(--ok)}.chip.late{background:var(--warn-bg);color:var(--warn)}
.chip.lapsed,.chip.cancelled{background:var(--bad-bg);color:var(--bad)}.chip.complete{background:var(--soft);color:var(--muted)}
.chip.sent{background:var(--ok-bg);color:var(--ok)}.chip.failed{background:var(--bad-bg);color:var(--bad)}
.btn{font:inherit;font-size:13px;font-weight:550;padding:5px 11px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.btn:hover{background:var(--soft)}.btn.danger{color:var(--bad)}.btn.danger.confirm{background:var(--bad);color:#fff;border-color:var(--bad)}
.btn:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
a{color:inherit}
.empty{color:var(--muted);padding:10px 0}
.err{color:var(--bad)}
</style>
</head>
<body>
<header class="bar">
  <div class="brand"><span class="mark" aria-hidden="true"></span><span id="name">Merchant</span><small>· Cadence</small></div>
  <div class="badges">
    <span class="badge ok" title="Addresses and payments come from a viewing key. There is no spending key on this server.">View-only · cannot spend</span>
    <span id="sync" class="badge">…</span>
    <span id="network" class="badge"></span>
  </div>
</header>
<main class="wrap">
  <p id="error" class="err" role="alert"></p>
  <section class="kpis" aria-label="Summary">
    <div class="kpi"><span>Received</span><strong id="k-received">–</strong><small>all time, ZEC</small></div>
    <div class="kpi"><span>Run rate</span><strong id="k-run">–</strong><small>ZEC per 30 days, active plans</small></div>
    <div class="kpi"><span>Active subscribers</span><strong id="k-active">–</strong><small id="k-total"></small></div>
    <div class="kpi"><span>Need attention</span><strong id="k-attn">–</strong><small>late or lapsed</small></div>
  </section>
  <section class="panel">
    <h2>Received per day <span class="muted" style="font-weight:400">· last 14 days, ZEC</span></h2>
    <div class="chart" id="chart"><svg id="chart-svg" role="img" aria-label="Bar chart of ZEC received per day"></svg><div class="tip" id="tip"></div></div>
  </section>
  <div class="grid2">
    <section class="panel"><h2>Upcoming renewals</h2><div class="scroll"><table id="upcoming"></table></div></section>
    <section class="panel"><h2>Need attention</h2><div class="scroll"><table id="attention"></table></div></section>
  </div>
  <section class="panel"><h2>Plans</h2><div class="scroll"><table id="plans"></table></div></section>
  <div class="grid2">
    <section class="panel"><h2>Recent payments</h2><div class="scroll"><table id="payments"></table></div></section>
    <section class="panel"><h2>Events and webhooks</h2><div class="scroll"><table id="events"></table></div></section>
  </div>
</main>
<script src="/admin.js"></script>
</body>
</html>`;

export const ADMIN_JS = `"use strict";
(() => {
  const hashToken = new URLSearchParams(location.hash.slice(1)).get("t");
  try { if (hashToken) localStorage.setItem("cadence-admin-token", hashToken); } catch {}
  if (hashToken) history.replaceState(null, "", "/admin");
  let token = hashToken || "";
  try { token = token || localStorage.getItem("cadence-admin-token") || ""; } catch {}

  const $ = (id) => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, String(v));
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const s = (tag, attrs) => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };

  async function api(path, body) {
    const r = await fetch(path, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || ("request failed: " + r.status));
    return data;
  }

  const zec = (zat) => { const v = (zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\\.$/, ""); return v === "" ? "0" : v; };
  let offset = 0;
  const now = () => Math.floor(Date.now() / 1000) + offset;
  function rel(t) {
    if (t === null || t === undefined) return "—";
    const d = t - now(), a = Math.abs(d);
    const v = a < 60 ? a + "s" : a < 3600 ? Math.round(a / 60) + "m" : a < 86400 ? Math.round(a / 3600) + "h" : Math.round(a / 86400) + "d";
    return d >= 0 ? "in " + v : v + " ago";
  }
  const short = (x, n = 8) => (x && x.length > 2 * n ? x.slice(0, n) + "…" + x.slice(-4) : x || "");
  const fill = (id, head, rows, emptyText) => {
    const t = $(id);
    t.replaceChildren(h("thead", {}, h("tr", {}, head.map(([label, cls]) => h("th", { class: cls }, label)))),
      h("tbody", {}, rows.length ? rows : [h("tr", {}, h("td", { colspan: head.length, class: "empty" }, emptyText))]));
  };

  const armed = new Set();
  function cancelBtn(id) {
    const on = armed.has(id);
    return h("button", { class: "btn danger" + (on ? " confirm" : ""), onclick: async () => {
      if (!armed.has(id)) { armed.add(id); setTimeout(() => armed.delete(id), 4000); return refresh(); }
      armed.delete(id);
      try { await api("/admin/api/cancel", { mandateId: id }); } catch (e) { $("error").textContent = e.message; }
      refresh();
    } }, on ? "Confirm" : "Cancel");
  }

  function chart(daily) {
    const svg = $("chart-svg"), tip = $("tip"), box = $("chart");
    const W = Math.max(320, box.clientWidth), H = 220, padL = 44, padB = 26, padT = 10;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.replaceChildren();
    const max = Math.max(1, ...daily.map((d) => d.zat));
    const nice = (() => { const raw = max / 1e8 / 4; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
    const top = Math.max(nice * 4, max / 1e8);
    const y = (z) => H - padB - ((z / 1e8) / top) * (H - padB - padT);
    for (let i = 0; i <= 4; i++) {
      const v = nice * i, yy = y(v * 1e8);
      if (yy < padT - 1) break;
      svg.append(s("line", { x1: padL, x2: W, y1: yy, y2: yy, stroke: "var(--grid)", "stroke-width": 1 }));
      const lbl = s("text", { x: padL - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }); lbl.textContent = String(+v.toFixed(8)); svg.append(lbl);
    }
    const n = daily.length, slot = (W - padL) / n, bw = Math.max(4, Math.min(28, slot - 6));
    daily.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2, x = cx - bw / 2, yy = y(d.zat), base = H - padB;
      if (d.zat > 0) {
        const r = Math.min(4, bw / 2, base - yy);
        svg.append(s("path", { d: "M" + x + "," + base + "V" + (yy + r) + "Q" + x + "," + yy + " " + (x + r) + "," + yy + "H" + (x + bw - r) + "Q" + (x + bw) + "," + yy + " " + (x + bw) + "," + (yy + r) + "V" + base + "Z", fill: "var(--chart)" }));
      }
      if (i % 2 === (n - 1) % 2) { const t = s("text", { x: cx, y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }); t.textContent = d.day.slice(5); svg.append(t); }
      const hit = s("rect", { x: padL + slot * i, y: padT, width: slot, height: H - padB - padT, fill: "transparent", tabindex: 0, "aria-label": d.day + ": " + zec(d.zat) + " ZEC" });
      const show = () => { tip.textContent = d.day + " · " + zec(d.zat) + " ZEC"; tip.style.left = (cx / W) * box.clientWidth + "px"; tip.style.top = (Math.min(yy, H - padB - 4) / H) * 220 + "px"; tip.classList.add("on"); };
      hit.addEventListener("mouseenter", show); hit.addEventListener("focus", show);
      hit.addEventListener("mouseleave", () => tip.classList.remove("on")); hit.addEventListener("blur", () => tip.classList.remove("on"));
      svg.append(hit);
    });
    svg.append(s("line", { x1: padL, x2: W, y1: H - padB, y2: H - padB, stroke: "var(--line)", "stroke-width": 1 }));
  }

  const EV = { "subscription.created": "New subscription", "invoice.issued": "Invoice issued", "invoice.paid": "Payment received", "subscription.cancelled": "Cancelled" };
  let last = null;
  function render(o) {
    offset = o.now - Math.floor(Date.now() / 1000);
    $("name").textContent = o.merchantName;
    $("network").textContent = o.network;
    const sync = $("sync");
    if (o.health && o.health.lastSyncError) { sync.className = "badge warn"; sync.textContent = "Sync problem"; sync.title = o.health.lastSyncError; }
    else if (o.health && o.health.lastSyncAt) { sync.className = "badge"; sync.textContent = "Synced " + rel(o.health.lastSyncAt); sync.title = ""; }
    else { sync.className = "badge"; sync.textContent = "Not synced yet"; }
    $("k-received").textContent = zec(o.receivedZat);
    $("k-run").textContent = zec(o.runRateZat);
    $("k-active").textContent = o.counts.active + o.counts.late;
    $("k-total").textContent = o.subscriptions + " total, " + o.counts.complete + " complete, " + o.counts.cancelled + " cancelled";
    $("k-attn").textContent = o.counts.late + o.counts.lapsed;
    chart(o.daily);
    fill("upcoming", [["Plan"], ["Subscription"], ["Due"], ["Paid", "num"], ["Amount", "num"]],
      o.upcoming.map((r) => h("tr", {}, h("td", {}, r.plan), h("td", { class: "mono", title: r.mandateId }, short(r.mandateId)), h("td", {}, rel(r.dueAt)), h("td", { class: "num" }, r.cyclesPaid + "/" + r.maxCycles), h("td", { class: "num" }, zec(r.amountZat)))),
      "No renewals scheduled.");
    fill("attention", [["Plan"], ["Subscription"], ["Status"], ["Was due"], [""]],
      o.attention.map((r) => h("tr", {}, h("td", {}, r.plan), h("td", { class: "mono", title: r.mandateId }, short(r.mandateId)), h("td", {}, h("span", { class: "chip " + r.status }, r.status)), h("td", {}, rel(r.dueAt)), h("td", { class: "num" }, cancelBtn(r.mandateId)))),
      "Everyone is paid up.");
    fill("plans", [["Plan"], ["Price"], ["Subscribers", "num"], ["Received", "num"], ["Checkout page"]],
      o.plans.map((p) => h("tr", {}, h("td", {}, p.name), h("td", {}, zec(p.amountZat) + " ZEC / " + p.every), h("td", { class: "num" }, p.subscribers), h("td", { class: "num" }, zec(p.receivedZat)), h("td", {}, h("a", { href: "/checkout/" + encodeURIComponent(p.id), target: "_blank", rel: "noopener" }, "/checkout/" + p.id)))),
      "No plans configured.");
    fill("payments", [["When"], ["Plan"], ["Cycle", "num"], ["Amount", "num"], ["Transaction"]],
      o.payments.map((p) => h("tr", {}, h("td", {}, p.at ? rel(p.at) : "block " + p.height), h("td", {}, p.plan), h("td", { class: "num" }, p.cycle), h("td", { class: "num" }, zec(p.amountZat)), h("td", { class: "mono", title: p.txid }, short(p.txid)))),
      "No payments yet.");
    fill("events", [["When"], ["Event"], ["Subscription"], ["Webhook"]],
      o.events.map((e) => h("tr", {}, h("td", {}, rel(e.at)), h("td", {}, (EV[e.type] || e.type) + (e.cycle ? " · cycle " + e.cycle : "")), h("td", { class: "mono", title: e.mandateId }, short(e.mandateId)),
        h("td", {}, e.webhook ? h("span", { class: "chip " + e.webhook.status, title: e.webhook.error || "" }, e.webhook.status + (e.webhook.code ? " " + e.webhook.code : "")) : h("span", { class: "muted" }, o.webhookConfigured ? "pending" : "off")))),
      "No events since this server started.");
  }

  async function refresh() {
    if (!token) { $("error").textContent = "Open the dashboard with the admin link printed when the server started."; return; }
    try { last = await api("/admin/api/overview"); render(last); $("error").textContent = ""; }
    catch (e) { $("error").textContent = e.message; }
  }
  window.addEventListener("resize", () => last && chart(last.daily));
  refresh();
  setInterval(refresh, 5000);
})();
`;
