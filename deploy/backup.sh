#!/usr/bin/env bash
# Daily backup of the SQLite data dir. Add to cron:
#   0 2 * * * /opt/comercium/backup.sh
set -euo pipefail

DEPLOY_DIR="/opt/comercium"
STAMP="$(date +%F)"

mkdir -p "$DEPLOY_DIR/backups"
tar -czf "$DEPLOY_DIR/backups/comercium-data-${STAMP}.tar.gz" -C "$DEPLOY_DIR" data

# Keep 14 days of backups
find "$DEPLOY_DIR/backups" -name 'comercium-data-*.tar.gz' -mtime +14 -delete

echo "Backup written: $DEPLOY_DIR/backups/comercium-data-${STAMP}.tar.gz"