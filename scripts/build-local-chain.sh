#!/bin/sh
# Builds the tools for a private Zcash regtest chain, so Cadence can be tested end to end
# without a public faucet:
#   - zebrad (Zcash node) with its internal miner
#   - zainod (light-wallet server that zcash-devtool talks to)
#   - zcash-devtool with regtest support
# Sources go in ../vendor (outside this repo). Versions are pinned.
set -eu

ZEBRA_TAG="v7.0.0"
ZAINO_TAG="0.10.1"

CARGO="${CARGO:-$HOME/.cargo/bin/cargo}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENDOR="$ROOT/vendor"
mkdir -p "$VENDOR"

fetch() { # repo tag dir
  if [ ! -d "$VENDOR/$3" ]; then
    git clone -q --depth 1 --branch "$2" "https://github.com/$1" "$VENDOR/$3"
  fi
}

fetch ZcashFoundation/zebra "$ZEBRA_TAG" zebra
fetch zingolabs/zaino "$ZAINO_TAG" zaino

echo "== zebrad $ZEBRA_TAG (internal miner)"
(cd "$VENDOR/zebra" && "$CARGO" build --release --locked --bin zebrad --features internal-miner)

echo "== zainod $ZAINO_TAG"
(cd "$VENDOR/zaino" && "$CARGO" build --release --locked --bin zainod)

echo "== zcash-devtool (regtest support)"
(cd "$VENDOR/zcash-devtool" && "$CARGO" build --release --features regtest_support)

echo
echo "built:"
ls -1 "$VENDOR/zebra/target/release/zebrad" "$VENDOR/zaino/target/release/zainod" "$VENDOR/zcash-devtool/target/release/zcash-devtool"
