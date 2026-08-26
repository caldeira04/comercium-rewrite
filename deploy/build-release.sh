#!/usr/bin/env bash
# Builds a self-contained release for the VPS (run on your dev machine).
#
# Usage:
#   ./deploy/build-release.sh <your-domain.com> [output-dir]
#
# Produces a tarball with: the compiled single binary, the CSR frontend
# (.output), drizzle migrations, and your existing SQLite data (migrated).
set -euo pipefail

DOMAIN="${1:-example.com}"
OUT_DIR="${2:-dist/release}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/web" "$OUT_DIR/drizzle"

cd "$REPO_ROOT"

echo "==> Building frontend (CSR) with VITE_API_BASE_URL=https://${DOMAIN}"
VITE_API_BASE_URL="https://${DOMAIN}" bun run --cwd frontend build

echo "==> Applying any pending tenant migrations to local data"
bun run --cwd backend db:tenant:migrate:all || true

echo "==> Compiling single binary (API + frontend)"
bun build --compile backend/src/index.ts --outfile "$OUT_DIR/comercium"

echo "==> Copying frontend output, migrations, and data"
cp -r frontend/.output/* "$OUT_DIR/web/"
cp -r backend/drizzle/migrations/* "$OUT_DIR/drizzle/"
if [ -d backend/data ]; then
    cp -r backend/data "$OUT_DIR/data"
fi

cd "$OUT_DIR"
TARBALL="${REPO_ROOT}/dist/comercium-release.tar.gz"
tar -czf "$TARBALL" .

echo
echo "Release ready: $TARBALL"
echo "Copy it to the VPS, e.g.:  scp $TARBALL user@<VPS_IP>:/tmp/"
echo "Then on the VPS run:  sudo bash /path/to/deploy/install.sh <your-domain.com> /tmp/comercium-release.tar.gz"