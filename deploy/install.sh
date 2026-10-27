#!/usr/bin/env bash
# Installs a Comercium release on a systemd Linux VPS (including Oracle Linux 9
# aarch64). Run on the VPS as a sudo user after the one-time service setup.
#
# Steps: stop the service, back up data/ (master + tenant SQLite files) and the
# current release, unpack the new release, migrate every database with
# `comercium --migrate`, then start the service. If the migration or the start
# fails, the backup is restored and the previous release is started again.
#
# Usage:
#   sudo bash deploy/install.sh /path/to/comercium-release.tar.gz
set -euo pipefail

RELEASE_TARBALL="${1:-/tmp/comercium-release.tar.gz}"
DEPLOY_DIR="/opt/comercium"
BACKUP_DIR="${DEPLOY_DIR}/backups"
KEEP_DEPLOY_BACKUPS=10
RELEASE_PATHS=(comercium web drizzle knowledge)

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

mkdir -p "$DEPLOY_DIR/data/tenants" "$BACKUP_DIR"

echo "==> 1/5 Stopping service"
systemctl stop comercium

echo "==> 2/5 Backing up databases and current release"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pre-deploy-${STAMP}.tar.gz"
backup_paths=(data)
for p in "${RELEASE_PATHS[@]}"; do
    [ -e "${DEPLOY_DIR}/${p}" ] && backup_paths+=("$p")
done
tar -czf "$BACKUP_FILE" -C "$DEPLOY_DIR" "${backup_paths[@]}"
tar -tzf "$BACKUP_FILE" >/dev/null
echo "    master: $([ -f "$DEPLOY_DIR/data/master.sqlite" ] && echo yes || echo no)," \
    "tenants: $(find "$DEPLOY_DIR/data/tenants" -maxdepth 1 -name '*.sqlite' | wc -l)"
echo "    backup: $BACKUP_FILE"

rollback() {
    echo "!!> Deploy failed, restoring $BACKUP_FILE" >&2
    systemctl stop comercium || true
    rm -rf "${DEPLOY_DIR}/data"
    for p in "${RELEASE_PATHS[@]}"; do rm -rf "${DEPLOY_DIR:?}/${p}"; done
    tar -xzf "$BACKUP_FILE" -C "$DEPLOY_DIR"
    chown -R "$SERVICE_USER" "$DEPLOY_DIR/data"
    if [ -x "${DEPLOY_DIR}/comercium" ]; then
        systemctl start comercium || true
        echo "!!> Previous release restored and restarted." >&2
    else
        echo "!!> Data restored; there was no previous release to start." >&2
    fi
    exit 1
}

echo "==> 3/5 Unpacking release into ${DEPLOY_DIR}"
for p in "${RELEASE_PATHS[@]}"; do rm -rf "${DEPLOY_DIR:?}/${p}"; done
tar -xzf "$RELEASE_TARBALL" -C "$DEPLOY_DIR" || rollback
chmod +x "$DEPLOY_DIR/comercium"
chown -R "$SERVICE_USER" "$DEPLOY_DIR/data" "$BACKUP_DIR"

echo "==> 4/5 Migrating master and tenant databases"
# Run as the service would: same user, working dir and environment.
migrate_props=(
    -p "User=${SERVICE_USER}"
    -p "WorkingDirectory=${DEPLOY_DIR}"
)
read -r -a service_env <<<"$(systemctl show --property=Environment --value comercium.service)"
for kv in "${service_env[@]}"; do migrate_props+=(-p "Environment=${kv}"); done
while read -r env_file; do
    [ -n "$env_file" ] && migrate_props+=(-p "EnvironmentFile=${env_file}")
done < <(systemctl show --property=EnvironmentFiles --value comercium.service | sed -E 's/ \(ignore_errors=[a-z]+\)//g; s/ /\n/g')
systemd-run --quiet --wait --pipe --collect "${migrate_props[@]}" \
    "${DEPLOY_DIR}/comercium" --migrate || rollback

echo "==> 5/5 Starting service"
systemctl daemon-reload
systemctl start comercium
sleep 5
systemctl is-active --quiet comercium || rollback

# Keep only the most recent pre-deploy backups (daily backup.sh files are separate).
find "$BACKUP_DIR" -maxdepth 1 -name 'pre-deploy-*.tar.gz' -printf '%T@ %p\n' \
    | sort -rn | tail -n +$((KEEP_DEPLOY_BACKUPS + 1)) | cut -d' ' -f2- | xargs -r rm -f

echo
echo "Done."
echo "  - Status: systemctl status comercium"
echo "  - Logs:   journalctl -u comercium -f"
echo "  - Backup: $BACKUP_FILE"
