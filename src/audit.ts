import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { canonical, sha256Hex } from "./canonical.ts";

export interface AuditEntry {
  seq: number;
  at: number;
  event: string;
  detail: Record<string, unknown>;
  prev: string;
  hash: string;
}

/** Append-only, hash-chained. Editing or removing a line breaks every later hash. */
export class AuditLog {
  readonly path: string;
  private last: { seq: number; hash: string };

  constructor(path: string) {
    this.path = path;
    this.last = { seq: 0, hash: "0".repeat(64) };
    if (existsSync(path)) {
      const entries = AuditLog.read(path);
      const tail = entries[entries.length - 1];
      if (tail) this.last = { seq: tail.seq, hash: tail.hash };
    }
  }

  append(event: string, detail: Record<string, unknown>, at: number): AuditEntry {
    const seq = this.last.seq + 1;
    const body = { seq, at, event, detail, prev: this.last.hash };
    const entry: AuditEntry = { ...body, hash: sha256Hex(canonical(body)) };
    appendFileSync(this.path, JSON.stringify(entry) + "\n");
    this.last = { seq, hash: entry.hash };
    return entry;
  }

  static read(path: string): AuditEntry[] {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as AuditEntry);
  }

  static verify(path: string): { ok: true } | { ok: false; atSeq: number } {
    let prev = "0".repeat(64);
    for (const e of AuditLog.read(path)) {
      const { hash, ...body } = e;
      if (e.prev !== prev || sha256Hex(canonical(body)) !== hash) return { ok: false, atSeq: e.seq };
      prev = hash;
    }
    return { ok: true };
  }
}
