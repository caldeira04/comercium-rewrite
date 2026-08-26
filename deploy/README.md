# Comercium deployment kit
#
# One machine, one process: the compiled single binary serves the API (Elysia,
# :3000) and the CSR frontend (Nitro bun-preset, :3001). Caddy terminates HTTPS
# and routes /master/* and /tenant/* to the API, everything else to the frontend,
# so the browser talks to a single origin (no CORS, Secure Lax cookies work).
#
# No Bun or Node is needed on the VPS — the binary embeds the Bun runtime.

## 1. Point DNS at the VPS
#   Create an A record:  example.com  ->  <VPS public IP>

## 2. Build the release (on your dev machine)
#   ./deploy/build-release.sh example.com
#   -> dist/comercium-release.tar.gz (binary + frontend + migrations + data)

## 3. Copy it to the VPS
#   scp dist/comercium-release.tar.gz user@<VPS_IP>:/tmp/

## 4. Install on the VPS (Ubuntu/Debian, as sudo)
#   Copy deploy/install.sh to the VPS (or git clone), then:
#   sudo bash install.sh example.com /tmp/comercium-release.tar.gz
#   install.sh: installs Caddy (auto HTTPS), unpacks to /opt/comercium, writes
#   /opt/comercium/comercium.env, generates /etc/caddy/Caddyfile, and enables the
#   comercium systemd service.

## 5. Verify
#   systemctl status comercium
#   journalctl -u comercium -f
#   curl -s https://example.com/login | head -c 200

## Notes
# - Fresh start: delete /opt/comercium/data, then the /onboarding flow creates
#   the first tenant + admin on first visit.
# - Existing data: the release bundles backend/data (tenant migrations applied
#   at build time). Master DB auto-migrates on boot.
# - Backups: copy deploy/backup.sh to /opt/comercium/backup.sh and add a cron job:
#       0 2 * * * /opt/comercium/backup.sh
#   Backups land in /opt/comercium/backups/. Move them off-box (rclone/restic)
#   for real safety.
# - Upgrading: rebuild + re-run build-release.sh, scp, then on the VPS:
#       sudo systemctl stop comercium
#       sudo tar -xzf /tmp/comercium-release.tar.gz -C /opt/comercium
#       sudo chmod +x /opt/comercium/comercium
#       sudo systemctl start comercium
#   (data/ and backups/ are preserved — the tarball only overwrites comercium,
#    web/, and drizzle/.)