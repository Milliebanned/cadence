#!/bin/sh
# Sets up the Cadence live demo on a fresh Ubuntu 24.04 server (arm64 or amd64) so it runs 24/7:
#   - build tools, Node.js and Rust (official releases, checksums verified)
#   - zebrad, zainod and zcash-devtool built from pinned sources
#   - Caddy for automatic HTTPS
#   - a systemd service that starts the demo on boot and restarts it if it ever stops
#
# Usage, from the repository directory on the server:
#   sudo sh scripts/server-setup.sh <public-ip>          # uses <ip>.sslip.io, no domain needed
#   sudo sh scripts/server-setup.sh <public-ip> <domain> # or your own domain (point *.domain and domain at the IP)
set -eu

IP="${1:?usage: server-setup.sh <public-ip> [domain]}"
DOMAIN="${2:-$(echo "$IP" | tr . -).sslip.io}"
RUN_USER="${SUDO_USER:-ubuntu}"
HOME_DIR="$(getent passwd "$RUN_USER" | cut -d: -f6)"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="v24.20.0"

case "$(uname -m)" in
  aarch64|arm64) NODE_ARCH=arm64; RUST_TRIPLE=aarch64-unknown-linux-gnu ;;
  x86_64) NODE_ARCH=x64; RUST_TRIPLE=x86_64-unknown-linux-gnu ;;
  *) echo "unsupported architecture $(uname -m)"; exit 1 ;;
esac

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q build-essential pkg-config libssl-dev protobuf-compiler clang libclang-dev git curl \
  ca-certificates xz-utils iptables-persistent debian-keyring debian-archive-keyring apt-transport-https gnupg

echo "== Node.js $NODE_VERSION"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v24" ]; then
  T=$(mktemp -d)
  F="node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$F" -o "$T/$F"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" -o "$T/SHASUMS256.txt"
  (cd "$T" && grep " $F\$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$T/$F" -C /usr/local --strip-components=1
  rm -rf "$T"
fi
node -v

echo "== Rust"
if [ ! -x "$HOME_DIR/.cargo/bin/cargo" ]; then
  T=$(mktemp -d)
  curl -fsSL "https://static.rust-lang.org/rustup/dist/$RUST_TRIPLE/rustup-init" -o "$T/rustup-init"
  curl -fsSL "https://static.rust-lang.org/rustup/dist/$RUST_TRIPLE/rustup-init.sha256" -o "$T/rustup-init.sha256"
  (cd "$T" && echo "$(cut -d' ' -f1 rustup-init.sha256)  rustup-init" | sha256sum -c -)
  chmod +x "$T/rustup-init"
  sudo -u "$RUN_USER" "$T/rustup-init" -y --profile minimal --no-modify-path
  rm -rf "$T"
fi

echo "== Zcash tools (zebrad, zainod, zcash-devtool): this takes a while"
sudo -u "$RUN_USER" env CARGO="$HOME_DIR/.cargo/bin/cargo" PATH="$HOME_DIR/.cargo/bin:$PATH" sh "$REPO/scripts/build-local-chain.sh"
if [ ! -d "$(dirname "$REPO")/vendor/zcash-devtool" ]; then echo "zcash-devtool missing"; exit 1; fi

echo "== Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q && apt-get install -y -q caddy
fi
cat > /etc/caddy/Caddyfile <<EOF
# Cadence live demo. Everything behind Caddy listens on 127.0.0.1 only.
$DOMAIN {
	reverse_proxy 127.0.0.1:8770
}
shop.$DOMAIN {
	reverse_proxy 127.0.0.1:8780
}
app.$DOMAIN {
	reverse_proxy 127.0.0.1:8790
}
EOF
systemctl enable caddy
systemctl restart caddy

echo "== firewall: allow HTTP and HTTPS (Oracle's Ubuntu images block them by default)"
for P in 80 443; do
  iptables -C INPUT -p tcp --dport "$P" -m state --state NEW -j ACCEPT 2>/dev/null ||
    iptables -I INPUT 5 -p tcp --dport "$P" -m state --state NEW -j ACCEPT
done
netfilter-persistent save

echo "== service"
cat > /etc/systemd/system/cadence-demo.service <<EOF
[Unit]
Description=Cadence live demo (private Zcash chain, merchant, subscriber app)
After=network-online.target
Wants=network-online.target

[Service]
User=$RUN_USER
WorkingDirectory=$REPO
Environment=CADENCE_PUBLIC_DOMAIN=$DOMAIN
Environment=CADENCE_DEMO_DIR=$HOME_DIR/.cadence-demo
ExecStart=/usr/local/bin/node $REPO/src/demo.ts
Restart=always
RestartSec=5
# stop every process the demo started, so a restart never finds ports still taken
KillMode=control-group
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable cadence-demo
systemctl restart cadence-demo

echo
echo "Done. First start creates the chain (a minute or two). Then open:"
echo "  https://$DOMAIN"
echo "Logs: journalctl -u cadence-demo -f   and   $HOME_DIR/.cadence-demo/*.log"
