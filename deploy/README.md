# Comercium deployment kit
#
# One machine, one process: the compiled single binary serves the API (Elysia,
# :3000) and the CSR frontend (Nitro bun-preset, :3001). Caddy terminates HTTPS
# and routes /master/* and /tenant/* to the API, everything else to the frontend,
# so the browser talks to a single origin (no CORS, Secure Lax cookies work).
#
# The admin panel API lives under /master/admin/* (NOT /admin/*), so Caddy routes
# it to the API. The admin panel SPA pages live under /admin/* (frontend). Do not
# add /admin/* to the API path list in the Caddyfile, or the SPA pages will break.
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

## 6. Automatic deploys on push to main (GitHub Actions)
#   .github/workflows/deploy.yml rebuilds the release and redeploys on every
#   push to `main` (and via the "Run workflow" button). It:
#     1. Checks out the repo, installs deps, runs ./deploy/build-release.sh
#     2. Uploads dist/comercium-release.tar.gz + deploy/install.sh to the VPS
#     3. Runs install.sh remotely (preserves /opt/comercium/data), restarts the
#        systemd service, and health-checks https://<domain>/login
#
#   Prerequisites on the VPS (one-time):
#     - The `comercium` systemd service installed and the SSH user allowed
#       passwordless sudo for the install/restart commands.
#     - The workflow skips wiping data, so redeploys are non-destructive.
#
#   Required GitHub repository secrets:
#     DEPLOY_DOMAIN  Public domain, e.g. comerciumerp.com.br
#     VPS_HOST       VPS IP or hostname
#     VPS_USER       SSH user (must have passwordless sudo)
#     VPS_SSH_KEY    SSH private key (OpenSSH format) of that user
#     VPS_HOST_KEY   (recommended) the VPS host public key, as printed by:
#                      ssh-keyscan -t ed25519 <VPS_HOST>
#                    If omitted, the workflow falls back to ssh-keyscan at build
#                    time (weaker — host key is not pinned).
#   To grab the host key for the secret:
#     ssh-keyscan -t ed25519 <VPS_HOST>