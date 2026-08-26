#!/usr/bin/env bash
# Installs Comercium on the VPS (Ubuntu/Debian). Run on the VPS, as a sudo user.
#
# Usage:
#   sudo bash deploy/install.sh <your-domain.com> /path/to/comercium-release.tar.gz
set -euo pipefail

RELEASE_TARBALL="${2:-/tmp/comercium-release.tar.gz}"
DEPLOY_DIR="/opt/comercium"

echo "==> 1/1 Unpacking release into ${DEPLOY_DIR}"
mkdir -p "$DEPLOY_DIR"
rm -rf "${DEPLOY_DIR}/comercium" "${DEPLOY_DIR}/web" "${DEPLOY_DIR}/drizzle"
tar -xzf "$RELEASE_TARBALL" -C "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/data" "$DEPLOY_DIR/backups"
chmod +x "$DEPLOY_DIR/comercium"

systemctl daemon-reload
systemctl restart comercium

echo
echo "Done."
echo "  - Status: systemctl status comercium"
echo "  - Logs:   journalctl -u comercium -f"
echo "  - Backup: copy deploy/backup.sh to /opt/comercium/backup.sh and add a cron job"
