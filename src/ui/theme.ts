/** Shared look for every Cadence page. No web fonts or CDNs: for a privacy tool, loading
 *  assets from a third party would tell that party who opened the page. */
export const THEME_CSS = `
:root{
  --paper:#08070a;--surface:rgba(255,255,255,.035);--raised:#16140f;--ink:#f6f2e9;--ink-2:#cfc8b9;--muted:#8d8678;--faint:#5d584f;
  --line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.14);--soft:rgba(255,255,255,.05);
  --gold:#e8b44c;--gold-2:#f7d58e;--gold-deep:#b47d1d;--gold-soft:rgba(232,180,76,.12);--gold-ink:#f7d58e;
  --gold-grad:linear-gradient(135deg,#f7d58e 0%,#e8b44c 42%,#b47d1d 100%);
  --band:rgba(8,7,10,.7);--band-ink:#f6f2e9;--band-muted:#8d8678;--band-line:rgba(255,255,255,.08);
  --ok:#5fd39a;--ok-soft:rgba(95,211,154,.12);--warn:#f0b866;--warn-soft:rgba(240,184,102,.12);--bad:#f08a7e;--bad-soft:rgba(240,138,126,.12);
  --r-s:10px;--r:14px;--r-l:22px;
  --shadow:0 30px 80px -40px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.05);
  --shadow-l:0 50px 120px -30px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.06);
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  color-scheme:dark;
}
*{box-sizing:border-box}
html{background:var(--paper)}
body{margin:0;color:var(--ink);min-height:100vh;background:radial-gradient(1100px 520px at 78% -10%,rgba(232,180,76,.16),transparent 60%),radial-gradient(800px 420px at 0% 0%,rgba(232,180,76,.05),transparent 60%),var(--paper);background-attachment:fixed}
body{font:15px/1.55 var(--font);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:"ss01","cv11"}
h1,h2,h3{margin:0;letter-spacing:-.03em;font-weight:660;color:var(--ink)}
p{margin:0}
a{color:inherit;text-underline-offset:3px}
.num{font-variant-numeric:tabular-nums}
.mono{font-family:var(--mono);font-size:12.5px;letter-spacing:-.01em}
.muted{color:var(--muted)}.faint{color:var(--faint)}
.eyebrow{font-size:11px;font-weight:650;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.hidden{display:none!important}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* top band */
.band{position:sticky;top:0;z-index:15;background:var(--band);backdrop-filter:saturate(140%) blur(14px);color:var(--band-ink);border-bottom:1px solid var(--band-line)}
.band-inner{max-width:1180px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;font-weight:650;font-size:16.5px;letter-spacing:-.01em;color:var(--band-ink);text-decoration:none}
.logo small{font-weight:450;color:var(--band-muted);font-size:13.5px;margin-left:2px}
.band .chip{background:var(--soft);color:var(--ink-2);border:1px solid var(--line-2)}
.band .chip.ok{background:rgba(111,208,156,.12);color:#8fe0b4;border-color:rgba(111,208,156,.25)}
.band .chip.warn{background:rgba(234,176,99,.14);color:#f0c27e;border-color:rgba(234,176,99,.3)}

.page{max-width:1180px;margin:0 auto;padding:32px 28px 80px}
@media (max-width:760px){.page{padding:20px 16px 56px}.band-inner{padding:12px 16px}}

/* surfaces */
.card{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));border:1px solid var(--line);border-radius:var(--r-l);box-shadow:var(--shadow)}
.pad{padding:22px 24px}@media (max-width:520px){.pad{padding:18px}}
.divider{height:1px;background:var(--line);margin:18px 0}

/* chips */
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--soft);color:var(--muted);white-space:nowrap}
.chip svg{width:13px;height:13px}
.chip.ok{background:var(--ok-soft);color:var(--ok)}.chip.warn{background:var(--warn-soft);color:var(--warn)}
.chip.bad{background:var(--bad-soft);color:var(--bad)}.chip.gold{background:var(--gold-soft);color:var(--gold-ink)}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:14px;font-weight:600;line-height:1;padding:11px 17px;border-radius:12px;border:1px solid var(--line-2);background:var(--soft);color:var(--ink);cursor:pointer;text-decoration:none;transition:background .2s,border-color .2s,transform .2s,box-shadow .2s}
.btn:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22)}.btn:active{transform:translateY(1px)}
.btn svg{width:16px;height:16px}
.btn.primary,.btn.gold{background:var(--gold-grad);border-color:transparent;color:#1b1203;box-shadow:0 10px 36px -12px rgba(232,180,76,.7),inset 0 1px 0 rgba(255,255,255,.45)}
.btn.primary:hover,.btn.gold:hover{box-shadow:0 16px 46px -12px rgba(232,180,76,.9),inset 0 1px 0 rgba(255,255,255,.5);transform:translateY(-1px)}
.btn.ghost{background:transparent;border-color:transparent;color:var(--muted)}.btn.ghost:hover{background:var(--soft);color:var(--ink)}
.btn.danger{color:var(--bad);border-color:var(--line-2)}.btn.danger:hover{background:var(--bad-soft);border-color:var(--bad-soft)}
.btn.danger.armed{background:var(--bad);border-color:var(--bad);color:#1a0806}
.btn.lg{font-size:15.5px;padding:14px 20px;border-radius:12px}
.btn.block{width:100%}
.btn[disabled]{opacity:.5;cursor:default;transform:none}
:is(.btn,a,input,select,button,[tabindex]):focus-visible{outline:2px solid var(--gold);outline-offset:2px}

/* forms */
.field{display:flex;flex-direction:column;gap:6px}
.field label,.label{font-size:13px;font-weight:600;color:var(--ink-2)}
.field .hint{font-size:12.5px;color:var(--muted)}
.input{font:inherit;font-size:14.5px;padding:12px 13px;border:1px solid var(--line-2);border-radius:12px;background:rgba(0,0,0,.35);color:var(--ink);min-width:0;width:100%;transition:border-color .15s,box-shadow .15s}
.input::placeholder{color:var(--faint)}
.input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-soft)}
.error{color:var(--bad);font-size:13px}

/* tables */
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th{font-size:11.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:left;padding:0 10px 10px}
td{padding:12px 10px;border-top:1px solid var(--line);vertical-align:middle}
th:first-child,td:first-child{padding-left:0}th:last-child,td:last-child{padding-right:0}
td.r,th.r{text-align:right}
.scroll{overflow-x:auto}

/* meter */
.meter{height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.meter>span{display:block;height:100%;background:var(--gold-grad);border-radius:999px;box-shadow:0 0 14px rgba(232,180,76,.55);transition:width .6s ease}

/* icon + avatar */
.ico{width:18px;height:18px;flex:none}
.avatar{width:42px;height:42px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;font-weight:750;font-size:17px;background:var(--gold-grad);color:#1b1203;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);flex:none}
.empty{border:1px dashed var(--line-2);border-radius:var(--r-l);padding:36px 24px;text-align:center;color:var(--muted)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/** Cadence mark: a ring with a gap, the rhythm of a recurring payment. */
export const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-opacity=".22" stroke-width="2.5"/><path d="M12 2.75a9.25 9.25 0 1 1-8.01 4.63" stroke="#e3ae4a" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2.6" fill="#e3ae4a"/></svg>`;

const ic = (d: string) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  shield: ic('<path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  eyeOff: ic('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.6M6.6 6.6C4.6 7.9 3.1 9.9 2 12c1 2.5 5 7 10 7 1.9 0 3.6-.6 5.1-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  check: ic('<path d="m5 12 4.5 4.5L19 7"/>'),
  x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  repeat: ic('<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'),
  key: ic('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3"/>'),
  store: ic('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>'),
  chart: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  doc: ic('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  arrow: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  zec: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.6 8h6.8v1.7l-4.6 4.6h4.6V16H8.6v-1.7l4.6-4.6H8.6z M11.25 5.6h1.5V8h-1.5z M11.25 16h1.5v2.4h-1.5z" fill="currentColor"/></svg>`,
};
