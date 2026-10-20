#!/usr/bin/env bash
# Builds a self-contained release for the VPS (run on your dev machine).
#
# Usage:
#   ./deploy/build-release.sh <your-domain.com> [output-dir]
#
# Produces a tarball with the compiled binary, CSR frontend (.output), and
# Drizzle migrations. Production data stays on the VPS and is migrated at boot.
set -euo pipefail

DOMAIN="${1:-example.com}"
OUT_DIR="${2:-dist/release}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ "$(uname -m)" != "aarch64" ]; then
    echo "ERROR: build this release on Oracle Linux 9 ARM64 (aarch64)." >&2
    exit 1
fi

. /etc/os-release
if [ "${ID:-}" != "ol" ] || [[ "${VERSION_ID:-}" != 9* ]]; then
    echo "ERROR: build this release inside Oracle Linux 9 for ABI compatibility." >&2
    exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/web" "$OUT_DIR/drizzle"

cd "$REPO_ROOT"

echo "==> Building frontend (CSR) with VITE_API_BASE_URL=https://${DOMAIN}"
VITE_API_BASE_URL="https://${DOMAIN}" bun run --cwd frontend build

echo "==> Compiling single binary (API + frontend)"
bun build --compile backend/src/index.ts --outfile "$OUT_DIR/comercium"

echo "==> Copying frontend output and migrations"
cp -r frontend/.output/* "$OUT_DIR/web/"
cp -r backend/drizzle/migrations/* "$OUT_DIR/drizzle/"
cp -r backend/knowledge "$OUT_DIR/knowledge"

cd "$OUT_DIR"
TARBALL="${REPO_ROOT}/dist/comercium-release.tar.gz"
tar -czf "$TARBALL" .

echo
echo "Release ready: $TARBALL"
echo "Copy it to the VPS, e.g.:  scp $TARBALL user@<VPS_IP>:/tmp/"
echo "Then on the VPS run:  sudo bash /path/to/deploy/install.sh /tmp/comercium-release.tar.gz"
