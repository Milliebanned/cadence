import { DatabaseSync } from "node:sqlite";

export interface ReceivedPayment {
  txid: string;
  minedHeight: number | null;
  pool: "transparent" | "sapling" | "orchard" | "ironwood" | "unknown";
  address: string | null;
  valueZat: number;
  memo: string | null;
}

const POOLS: Record<number, ReceivedPayment["pool"]> = { 0: "transparent", 2: "sapling", 3: "orchard", 4: "ironwood" };

/** Txids are stored in internal byte order and displayed reversed. */
export function displayTxid(bytes: Uint8Array): string {
  return Buffer.from(bytes).reverse().toString("hex");
}

/** ZIP 302: a first byte up to 0xF4 means UTF-8 text, zero-padded to 512 bytes. */
export function decodeMemo(bytes: Uint8Array | null): string | null {
  if (!bytes || bytes.length === 0) return null;
  if (bytes[0]! > 0xf4) return null;
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  if (end === 0) return null;
  return Buffer.from(bytes.subarray(0, end)).toString("utf8");
}

/** Payments received from outside the wallet, read from a zcash_client_sqlite database.
 *  Opened read-only; the merchant wallet is created from a viewing key and holds no spend key. */
export function readReceived(dbPath: string): ReceivedPayment[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db
      .prepare(
        `SELECT txid, tx_mined_height AS mined_height, output_pool, to_address, value, memo
           FROM v_tx_outputs
          WHERE to_account_uuid IS NOT NULL
            AND from_account_uuid IS NULL
            AND is_change = 0`,
      )
      .all() as Array<{
      txid: Uint8Array;
      mined_height: number | null;
      output_pool: number;
      to_address: string | null;
      value: number;
      memo: Uint8Array | null;
    }>;
    return rows.map((r) => ({
      txid: displayTxid(r.txid),
      minedHeight: r.mined_height,
      pool: POOLS[r.output_pool] ?? "unknown",
      address: r.to_address,
      valueZat: Number(r.value),
      memo: decodeMemo(r.memo),
    }));
  } finally {
    db.close();
  }
}
