/** Reads each payment back from the chain and checks, as an outside observer would,
 *  that it reveals nothing beyond the fee, the block and the number of shielded actions. */

export interface PoolView {
  pool: "sapling" | "orchard" | "ironwood";
  actions: number;
  /** value leaving the pool (positive) or entering it (negative), in zatoshis */
  valueBalanceZat: number;
}

export interface TxView {
  txid: string;
  version: number;
  height: number | null;
  transparentInputs: number;
  transparentOutputs: number;
  transparentOutputValuesZat: number[];
  joinSplits: number;
  pools: PoolView[];
}

export interface Payment {
  mandateId: string;
  cycle: number;
  txid: string;
  amountZat: number;
  address: string | null;
  payeeMode: "address" | "merchant";
}

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export interface PaymentReport {
  payment: Payment;
  observerSees: string;
  checks: Check[];
}

export interface ProofReport {
  network: string;
  generatedAt: string;
  payments: PaymentReport[];
  global: Check[];
  control: PaymentReport | null;
  pass: boolean;
}

/** Zebra/zcashd `getrawtransaction <txid> 1` output to a TxView. */
export function txViewFromRpc(t: Record<string, unknown>): TxView {
  const zat = (v: unknown) => Math.round(Number(v ?? 0));
  const pools: PoolView[] = [];
  const sapSpends = (t.vShieldedSpend as unknown[] | undefined)?.length ?? 0;
  const sapOutputs = (t.vShieldedOutput as unknown[] | undefined)?.length ?? 0;
  if (sapSpends + sapOutputs > 0) pools.push({ pool: "sapling", actions: sapSpends + sapOutputs, valueBalanceZat: zat(t.valueBalanceZat) });
  for (const name of ["orchard", "ironwood"] as const) {
    const b = t[name] as { actions?: unknown[]; valueBalanceZat?: number } | undefined;
    const n = b?.actions?.length ?? 0;
    if (n > 0) pools.push({ pool: name, actions: n, valueBalanceZat: zat(b?.valueBalanceZat) });
  }
  const vout = (t.vout as Array<{ valueZat?: number; value?: number }> | undefined) ?? [];
  return {
    txid: String(t.txid),
    version: Number(t.version),
    height: typeof t.height === "number" ? t.height : null,
    transparentInputs: (t.vin as unknown[] | undefined)?.length ?? 0,
    transparentOutputs: vout.length,
    transparentOutputValuesZat: vout.map((o) => zat(o.valueZat ?? Number(o.value ?? 0) * 1e8)),
    joinSplits: (t.vjoinsplit as unknown[] | undefined)?.length ?? 0,
    pools,
  };
}

export async function fetchTxRpc(rpcUrl: string, txid: string): Promise<TxView> {
  const r = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getrawtransaction", params: [txid, 1] }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await r.json()) as { result?: Record<string, unknown>; error?: { message?: string } };
  if (!body.result) throw new Error(`getrawtransaction ${txid}: ${body.error?.message ?? r.status}`);
  return txViewFromRpc(body.result);
}

function describe(tx: TxView): string {
  const pools = tx.pools.map((p) => `${p.actions} ${p.pool} action${p.actions === 1 ? "" : "s"}`).join(", ") || "no shielded actions";
  const fee = feeOf(tx);
  return `v${tx.version} transaction in block ${tx.height ?? "(unmined)"}: ${pools}; ` +
    `${tx.transparentInputs} transparent inputs, ${tx.transparentOutputs} transparent outputs; ` +
    `fee ${fee === null ? "unknown" : `${fee} zat`}.`;
}

/** With no transparent parts, the net value leaving the shielded pools is exactly the fee. */
function feeOf(tx: TxView): number | null {
  if (tx.transparentInputs || tx.transparentOutputs) return null;
  return tx.pools.reduce((s, p) => s + p.valueBalanceZat, 0);
}

export function checkPayment(payment: Payment, tx: TxView): PaymentReport {
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  add("transaction found on chain", tx.txid === payment.txid && tx.height !== null, tx.height !== null ? `mined at height ${tx.height}` : "not mined");
  add("no transparent inputs", tx.transparentInputs === 0, `${tx.transparentInputs} transparent inputs`);
  add("no transparent outputs", tx.transparentOutputs === 0, `${tx.transparentOutputs} transparent outputs`);
  add("no Sprout joinsplits", tx.joinSplits === 0, `${tx.joinSplits} joinsplits`);
  add("uses only shielded pools", tx.pools.length > 0, tx.pools.map((p) => p.pool).join(", ") || "none");

  const crossing = tx.pools.filter((p) => p.valueBalanceZat < 0);
  const fee = feeOf(tx);
  add(
    "no value crosses into or out of the shielded pool except the fee",
    crossing.length === 0 && fee !== null && fee >= 0 && fee < payment.amountZat,
    fee === null ? "transparent parts present" : `net value leaving shielded pools: ${fee} zat (the fee)`,
  );

  const publicNumbers = [...tx.transparentOutputValuesZat, ...tx.pools.map((p) => Math.abs(p.valueBalanceZat))];
  add(
    "payment amount does not appear anywhere public",
    !publicNumbers.includes(payment.amountZat),
    `amount ${payment.amountZat} zat; public values: ${publicNumbers.join(", ") || "none"}`,
  );

  return { payment, observerSees: describe(tx), checks };
}

export function globalChecks(reports: PaymentReport[]): Check[] {
  const checks: Check[] = [];
  const merchantAddrs = reports.filter((r) => r.payment.payeeMode === "merchant").map((r) => r.payment.address ?? "");
  checks.push({
    name: "merchant mode: every cycle paid a different address",
    pass: new Set(merchantAddrs).size === merchantAddrs.length,
    detail: `${merchantAddrs.length} merchant-mode payments, ${new Set(merchantAddrs).size} distinct addresses (addresses never appear on chain; this guards the merchant's own records)`,
  });

  const shapes = new Set(reports.map((r) => r.observerSees.replace(/block \d+|\(unmined\)/, "block N")));
  checks.push({
    name: "all payments look alike on chain",
    pass: shapes.size <= 1,
    detail: shapes.size <= 1 ? "same version, pool, action count and fee for every payment" : `${shapes.size} different shapes`,
  });

  const txids = reports.map((r) => r.payment.txid);
  checks.push({
    name: "each cycle was paid exactly once",
    pass: new Set(txids).size === txids.length && new Set(reports.map((r) => `${r.payment.mandateId}:${r.payment.cycle}`)).size === reports.length,
    detail: `${reports.length} payments, ${new Set(txids).size} transactions`,
  });

  const crossings = reports.filter((r) => r.checks.some((c) => c.name.startsWith("no transparent") && !c.pass)).length;
  checks.push({
    name: "nothing for amount/timing linking heuristics to match",
    pass: crossings === 0,
    detail:
      crossings === 0
        ? "no payment enters or leaves the shielded pool, so round-trip, sum-match and quick-exit heuristics have no public amounts or addresses to pair"
        : `${crossings} payments touch transparent value`,
  });
  return checks;
}

export function buildReport(network: string, items: Array<{ payment: Payment; tx: TxView }>, control?: { payment: Payment; tx: TxView }): ProofReport {
  const payments = items.map((i) => checkPayment(i.payment, i.tx));
  const global = globalChecks(payments);
  const controlReport = control ? checkPayment(control.payment, control.tx) : null;
  const allPass = payments.every((p) => p.checks.every((c) => c.pass)) && global.every((c) => c.pass);
  // The control is a known-leaky transaction: the checker is only trusted if it fails it.
  const controlCaught = controlReport ? controlReport.checks.some((c) => !c.pass) : true;
  return { network, generatedAt: new Date().toISOString(), payments, global, control: controlReport, pass: allPass && controlCaught && payments.length > 0 };
}

export function renderMarkdown(r: ProofReport): string {
  const mark = (ok: boolean) => (ok ? "PASS" : "FAIL");
  const lines: string[] = [];
  lines.push(`# Cadence privacy proof`, ``, `Network: ${r.network} · generated ${r.generatedAt} · **${r.pass ? "ALL CHECKS PASS" : "FAILED"}**`, ``);
  lines.push(`Every payment the agent made was read back from the chain and checked the way an outside observer would see it.`, ``);
  for (const p of r.payments) {
    lines.push(`## Mandate ${p.payment.mandateId.slice(0, 12)} · cycle ${p.payment.cycle} · \`${p.payment.txid}\``, ``);
    lines.push(`What anyone can see: ${p.observerSees}`, ``);
    lines.push(`| Check | Result | Detail |`, `|---|---|---|`);
    for (const c of p.checks) lines.push(`| ${c.name} | ${mark(c.pass)} | ${c.detail} |`);
    lines.push(``);
  }
  lines.push(`## Across all payments`, ``, `| Check | Result | Detail |`, `|---|---|---|`);
  for (const c of r.global) lines.push(`| ${c.name} | ${mark(c.pass)} | ${c.detail} |`);
  lines.push(``);
  if (r.control) {
    const caught = r.control.checks.some((c) => !c.pass);
    lines.push(`## Control: a known leaky transaction \`${r.control.payment.txid}\``, ``);
    lines.push(`The same checks run on a transaction with transparent outputs. The checker is only trustworthy if it flags it.`, ``);
    lines.push(`What anyone can see: ${r.control.observerSees}`, ``);
    lines.push(`Control ${caught ? "caught (expected)" : "NOT caught: the checker is broken"}:`, ``);
    for (const c of r.control.checks.filter((c) => !c.pass)) lines.push(`- flagged: ${c.name} (${c.detail})`);
    lines.push(``);
  }
  lines.push(`## What this does not cover`, ``);
  lines.push(`- Network level: the light-wallet server sees the IP that syncs and broadcasts. Use \`"connection": "tor"\` to hide it.`);
  lines.push(`- Timing: block heights are public. The agent spreads each send over a random window, but a payee who knows the schedule can still expect a payment.`);
  lines.push(`- The payee learns the amount and that the same mandate paid each cycle. That is the point of a subscription and is never visible to anyone else.`);
  return lines.join("\n") + "\n";
}
