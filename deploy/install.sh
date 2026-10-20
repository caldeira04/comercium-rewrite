#!/usr/bin/env bash
# Installs a Comercium release on a systemd Linux VPS (including Oracle Linux 9
# aarch64). Run on the VPS as a sudo user after the one-time service setup.
#
# Usage:
#   sudo bash deploy/install.sh /path/to/comercium-release.tar.gz
set -euo pipefail

RELEASE_TARBALL="${1:-/tmp/comercium-release.tar.gz}"
DEPLOY_DIR="/opt/comercium"

echo "==> 1/1 Unpacking release into ${DEPLOY_DIR}"
if [ ! -s "$RELEASE_TARBALL" ] || ! tar -tzf "$RELEASE_TARBALL" >/dev/null; then
    echo "ERROR: release archive is missing or invalid: $RELEASE_TARBALL" >&2
    exit 1
fi

if ! systemctl cat comercium.service >/dev/null 2>&1; then
    echo "ERROR: comercium.service is not installed. Complete the one-time VPS setup first." >&2
    exit 1
fi

SERVICE_WORKDIR="$(systemctl show --property=WorkingDirectory --value comercium.service)"
SERVICE_EXEC="$(systemctl show --property=ExecStart --value comercium.service)"
if [ "$SERVICE_WORKDIR" != "$DEPLOY_DIR" ] || [[ "$SERVICE_EXEC" != *"${DEPLOY_DIR}/comercium"* ]]; then
    echo "ERROR: comercium.service must use WorkingDirectory=${DEPLOY_DIR} and ExecStart=${DEPLOY_DIR}/comercium." >&2
    exit 1
fi

SERVICE_USER="$(systemctl show --property=User --value comercium.service)"
SERVICE_USER="${SERVICE_USER:-root}"
if [ "$SERVICE_USER" != "root" ] && ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    echo "ERROR: service user '$SERVICE_USER' does not exist." >&2
    exit 1
fi

mkdir -p "$DEPLOY_DIR"
rm -rf "${DEPLOY_DIR}/comercium" "${DEPLOY_DIR}/web" "${DEPLOY_DIR}/drizzle" "${DEPLOY_DIR}/knowledge"
tar -xzf "$RELEASE_TARBALL" -C "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/data" "$DEPLOY_DIR/backups"
chmod +x "$DEPLOY_DIR/comercium"
chown -R "$SERVICE_USER" "$DEPLOY_DIR/data" "$DEPLOY_DIR/backups"

systemctl daemon-reload
systemctl restart comercium

echo
echo "Done."
echo "  - Status: systemctl status comercium"
echo "  - Logs:   journalctl -u comercium -f"
echo "  - Backup: copy deploy/backup.sh to /opt/comercium/backup.sh and add a cron job"
