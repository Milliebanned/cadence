import { ICONS, LOGO_SVG, THEME_CSS } from "./ui/theme.ts";

export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Cadence · Merchant</title>
<style>${THEME_CSS}
:root{--chart:#b8832a;--grid:rgba(255,255,255,.06)}
.badges{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.title{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.title h1{font-size:26px}
.title p{margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
@media (max-width:860px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{padding:18px 20px}.kpi strong{display:block;font-size:30px;letter-spacing:-.03em;margin:6px 0 2px}
.kpi small{color:var(--muted);font-size:12.5px}
.kpi.lead{background:linear-gradient(135deg,rgba(232,180,76,.16),rgba(232,180,76,.03));border-color:rgba(232,180,76,.28)}
.stack{display:flex;flex-direction:column;gap:18px}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
@media (max-width:920px){.grid2{grid-template-columns:1fr}}
.panel-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.panel-head h2{font-size:16px}
.chart{position:relative}
.chart svg{display:block;width:100%;height:230px;overflow:visible}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--paper);font-size:12.5px;font-weight:600;padding:6px 10px;border-radius:8px;white-space:nowrap;transform:translate(-50%,-115%);opacity:0;transition:opacity .1s}
.tip.on{opacity:1}
.empty-row{color:var(--muted);padding:14px 0}
.err{margin-bottom:14px}
.planlink{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2);text-decoration:none;border-bottom:1px solid var(--line-2)}
.planlink .ico{width:14px;height:14px}
.vk{display:flex;gap:12px;align-items:flex-start}
.vk .ico{color:var(--gold);margin-top:2px}
</style>
</head>
<body>
<header class="band">
  <div class="band-inner">
    <div class="logo">${LOGO_SVG}<span id="name">Merchant</span><small>· Cadence for merchants</small></div>
    <div class="badges">
      <span class="chip ok" title="Addresses and payments come from a viewing key. There is no spending key on this server.">${ICONS.eyeOff} View-only · cannot spend</span>
      <span id="sync" class="chip">…</span>
      <span id="network" class="chip"></span>
    </div>
  </div>
</header>
<main class="page">
  <p id="error" class="error err" role="alert"></p>
  <div class="title">
    <div><h1>Subscriptions</h1><p class="muted">Every number here comes from your viewing key. Customers' balances and other payments stay invisible to you.</p></div>
  </div>
  <section class="kpis" aria-label="Summary">
    <div class="card kpi lead"><span class="eyebrow">Received</span><strong id="k-received" class="num">–</strong><small>ZEC, all time</small></div>
    <div class="card kpi"><span class="eyebrow">Expected next 30 days</span><strong id="k-run" class="num">–</strong><small>ZEC still approved and falling due</small></div>
    <div class="card kpi"><span class="eyebrow">Active subscribers</span><strong id="k-active" class="num">–</strong><small id="k-total"></small></div>
    <div class="card kpi"><span class="eyebrow">Need attention</span><strong id="k-attn" class="num">–</strong><small>late or lapsed</small></div>
  </section>
  <div class="stack">
    <section class="card pad">
      <div class="panel-head"><h2>Received per day</h2><span class="muted small">last 14 days · ZEC</span></div>
      <div class="chart" id="chart"><svg id="chart-svg" role="img" aria-label="Bar chart of ZEC received per day"></svg><div class="tip" id="tip"></div></div>
    </section>
    <div class="grid2">
      <section class="card pad"><div class="panel-head"><h2>Upcoming renewals</h2></div><div class="scroll"><table id="upcoming"></table></div></section>
      <section class="card pad"><div class="panel-head"><h2>Need attention</h2></div><div class="scroll"><table id="attention"></table></div></section>
    </div>
    <section class="card pad"><div class="panel-head"><h2>Plans</h2><span class="muted small">share a checkout link to sell a plan</span></div><div class="scroll"><table id="plans"></table></div></section>
    <div class="grid2">
      <section class="card pad"><div class="panel-head"><h2>Recent payments</h2></div><div class="scroll"><table id="payments"></table></div></section>
      <section class="card pad"><div class="panel-head"><h2>Events and webhooks</h2></div><div class="scroll"><table id="events"></table></div></section>
    </div>
    <section class="card pad vk">${ICONS.key}<div><strong>Why this server cannot spend</strong><p class="muted small">It was created from a unified full viewing key. It can derive fresh receive addresses and see payments to them, but it holds no spending key. A breach of this server cannot move funds.</p></div></section>
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
      h("tbody", {}, rows.length ? rows : [h("tr", {}, h("td", { colspan: head.length, class: "empty-row" }, emptyText))]));
  };

  const armed = new Set();
  function cancelBtn(id) {
    const on = armed.has(id);
    return h("button", { class: "btn danger" + (on ? " armed" : ""), onclick: async () => {
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
    const max = Math.max(1e8, ...daily.map((d) => d.zat)); // empty chart: scale to 1 ZEC, not to one zatoshi
    const nice = (() => { const raw = max / 1e8 / 4; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
    const top = Math.max(nice * 4, max / 1e8);
    const y = (z) => H - padB - ((z / 1e8) / top) * (H - padB - padT);
    for (let i = 0; i <= 4; i++) {
      const v = nice * i, yy = y(v * 1e8);
      if (yy < padT - 1) break;
      svg.append(s("line", { x1: padL, x2: W, y1: yy, y2: yy, stroke: "var(--grid)", "stroke-width": 1 }));
      const lbl = s("text", { x: padL - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }); lbl.textContent = v.toFixed(8).replace(/0+$/, "").replace(/\\.$/, ""); svg.append(lbl);
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
    if (o.health && o.health.lastSyncError) { sync.className = "chip warn"; sync.textContent = "Sync problem"; sync.title = o.health.lastSyncError; }
    else if (o.health && o.health.lastSyncAt) { sync.className = "chip"; sync.textContent = "Synced " + rel(o.health.lastSyncAt); sync.title = ""; }
    else { sync.className = "chip"; sync.textContent = "Not synced yet"; }
    $("k-received").textContent = zec(o.receivedZat);
    $("k-run").textContent = zec(o.expected30dZat);
    $("k-active").textContent = o.counts.active + o.counts.late;
    $("k-total").textContent = o.subscriptions + " total, " + o.counts.complete + " complete, " + o.counts.cancelled + " cancelled";
    $("k-attn").textContent = o.counts.late + o.counts.lapsed;
    chart(o.daily);
    fill("upcoming", [["Plan"], ["Subscription"], ["Due"], ["Paid", "r"], ["Amount", "r"]],
      o.upcoming.map((r) => h("tr", {}, h("td", {}, r.plan), h("td", { class: "mono", title: r.mandateId }, short(r.mandateId)), h("td", {}, rel(r.dueAt)), h("td", { class: "r" }, r.cyclesPaid + "/" + r.maxCycles), h("td", { class: "r" }, zec(r.amountZat)))),
      "No renewals scheduled.");
    fill("attention", [["Plan"], ["Subscription"], ["Status"], ["Was due"], [""]],
      o.attention.map((r) => h("tr", {}, h("td", {}, r.plan), h("td", { class: "mono", title: r.mandateId }, short(r.mandateId)), h("td", {}, h("span", { class: "chip " + ({ late: "warn", lapsed: "bad", cancelled: "bad", active: "ok" }[r.status] || "") }, r.status)), h("td", {}, rel(r.dueAt)), h("td", { class: "r" }, cancelBtn(r.mandateId)))),
      "Everyone is paid up.");
    fill("plans", [["Plan"], ["Price"], ["Subscribers", "r"], ["Received", "r"], ["Checkout"]],
      o.plans.map((p) => h("tr", {}, h("td", {}, p.name), h("td", {}, zec(p.amountZat) + " ZEC / " + p.every), h("td", { class: "r" }, p.subscribers), h("td", { class: "r" }, zec(p.receivedZat)), h("td", {}, h("a", { class: "planlink", href: "/checkout/" + encodeURIComponent(p.id), target: "_blank", rel: "noopener" }, "Open checkout ↗")))),
      "No plans configured.");
    fill("payments", [["When"], ["Plan"], ["Cycle", "r"], ["Amount", "r"], ["Transaction"]],
      o.payments.map((p) => h("tr", {}, h("td", {}, p.at ? rel(p.at) : "block " + p.height), h("td", {}, p.plan), h("td", { class: "r" }, p.cycle), h("td", { class: "r" }, zec(p.amountZat)), h("td", { class: "mono", title: p.txid }, short(p.txid)))),
      "No payments yet.");
    fill("events", [["When"], ["Event"], ["Subscription"], ["Webhook"]],
      o.events.map((e) => h("tr", {}, h("td", {}, rel(e.at)), h("td", {}, (EV[e.type] || e.type) + (e.cycle ? " · cycle " + e.cycle : "")), h("td", { class: "mono", title: e.mandateId }, short(e.mandateId)),
        h("td", {}, e.webhook ? h("span", { class: "chip " + (e.webhook.status === "sent" ? "ok" : "bad"), title: e.webhook.error || "" }, e.webhook.status + (e.webhook.code ? " " + e.webhook.code : "")) : h("span", { class: "muted" }, o.webhookConfigured ? "pending" : "off")))),
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
