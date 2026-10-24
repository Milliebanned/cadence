import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBalance, parseInspect, parseTxid } from "../src/devtool.ts";

// Output captured from zcash-devtool on testnet.
const ORCHARD_ONLY = `Zcash address
 - Network: testnet
 - Kind: Unified Address
 - Receivers:
   - Orchard (utest1wq2xppytylgheavq7cqma0jfv2gmetzkdt4j6rwhhavh47rwatdrl68jfrnvd9am9pxm3yvpnqtl3yrwjdep9w77yylvcqzdluf6un4d)`;

const ORCHARD_SAPLING = `Zcash address
 - Network: testnet
 - Kind: Unified Address
 - Receivers:
   - Orchard (utest1qygzagn4ekqayvehwqjzs43jyd2yh3sznfx3xud64q57s2z9javspj6r4ft57hznv98cjfp2xjg8d43rye2xf8ejeae4uy6qwcwrshth)
   - Sapling (ztestsapling1y6972vecuxerqnvyhn9cxfwdt4ct89mes260x40mk5s9dx4732sfs7gt2vn4460zxn3zg978qze)`;

const TRANSPARENT = `Zcash address
 - Network: testnet
 - Kind: Transparent P2PKH
 - Corresponding TEX: textest1z754rp9kk9vdewx4wm7pstvm0u2rwlgyl53e9c`;

test("decodes an Orchard-only unified address", () => {
  assert.deepEqual(parseInspect(ORCHARD_ONLY), { network: "test", receivers: ["orchard"] });
});

test("decodes a unified address with Orchard and Sapling receivers", () => {
  assert.deepEqual(parseInspect(ORCHARD_SAPLING), { network: "test", receivers: ["orchard", "sapling"] });
});

test("decodes a transparent address as transparent only", () => {
  assert.deepEqual(parseInspect(TRANSPARENT), { network: "test", receivers: ["transparent"] });
});

test("rejects output that is not an address", () => {
  assert.throws(() => parseInspect("Error: invalid data"));
});

test("counts every shielded pool as spendable and keeps transparent apart", () => {
  const b = parseBalance(
    '{"chain_tip_height":4535902,"ironwood_spendable":7,"orchard_spendable":5,"sapling_spendable":3,"total":20,"transparent_spendable":5}',
  );
  assert.deepEqual(b, { chainTip: 4535902, shieldedSpendableZat: 15, transparentSpendableZat: 5, totalZat: 20 });
});

test("takes the last transaction id from send output", () => {
  const id = "a".repeat(64);
  assert.equal(parseTxid(`proposal ...\nTransaction ID: ${id}\n`), id);
  assert.throws(() => parseTxid("no id here"));
});
