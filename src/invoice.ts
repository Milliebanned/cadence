import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { canonical } from "./canonical.ts";
import type { Invoice } from "./types.ts";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export interface MerchantKeys {
  publicKeyHex: string;
  secretKeyHex: string;
}

export function generateMerchantKeys(): MerchantKeys {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub = publicKey.export({ format: "der", type: "spki" }).subarray(SPKI_ED25519_PREFIX.length);
  const sec = privateKey.export({ format: "der", type: "pkcs8" }).subarray(PKCS8_ED25519_PREFIX.length);
  return { publicKeyHex: pub.toString("hex"), secretKeyHex: sec.toString("hex") };
}

function unsigned(inv: Invoice): string {
  const { sig: _sig, ...rest } = inv;
  return canonical(rest);
}

export function memoFor(mandateId: string, cycle: number): string {
  return `cadence:v1:${mandateId.slice(0, 8)}:${cycle}`;
}

export function signInvoice(inv: Omit<Invoice, "sig">, secretKeyHex: string): Invoice {
  const key = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(secretKeyHex, "hex")]),
    format: "der",
    type: "pkcs8",
  });
  const sig = sign(null, Buffer.from(unsigned(inv as Invoice)), key).toString("hex");
  return { ...inv, sig };
}

export function verifyInvoice(inv: Invoice, publicKeyHex: string): boolean {
  if (!inv.sig || !/^[0-9a-f]{128}$/.test(inv.sig)) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(unsigned(inv)), key, Buffer.from(inv.sig, "hex"));
  } catch {
    return false;
  }
}
