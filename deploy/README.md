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
# GitHub Actions builds on an ARM64 runner inside Oracle Linux 9 to match the
# VPS architecture and Linux ABI.

## 1. Point DNS at the VPS
#   Create an A record:  example.com  ->  <VPS public IP>

## 2. Build the release (on Oracle Linux 9 ARM64)
#   ./deploy/build-release.sh example.com
#   -> dist/comercium-release.tar.gz (binary + frontend + migrations + help docs; no data)

## 3. Copy it to the VPS
#   scp dist/comercium-release.tar.gz user@<VPS_IP>:/tmp/

## 4. One-time VPS setup (Oracle Linux 9.8 aarch64)
#   The deploy workflow updates an existing installation; it does not provision
#   the host. Before the first deploy, create the `comercium` service account,
#   install deploy/comercium.service as /etc/systemd/system/comercium.service,
#   and create /opt/comercium/comercium.env. Adjust the unit if using another
#   service account, then add the AI provider configuration to
#   /opt/comercium/comercium.env (`OPENROUTER_API_KEY`, and optionally
#   `OPENROUTER_EMBEDDING_MODEL` / `OPENROUTER_CHAT_MODEL`). The key stays on
#   the backend and is never included in the release artifact. Then
#   install/configure Caddy for DEPLOY_DOMAIN and ensure the VPS user has
#   passwordless sudo for systemctl and release installation. Permit inbound
#   80/443 in both firewalld and the OCI security list/NSG. The host needs
#   systemd, tar, gzip, and curl; it does not need Bun. After preparing the
#   service and environment file, create /opt/comercium and run
#   `systemctl daemon-reload && systemctl enable comercium` before the first
#   Actions deploy. The workflow restarts it after installing the first binary.
#
#   Copy deploy/install.sh to the VPS (or git clone), then:
#   sudo bash install.sh /tmp/comercium-release.tar.gz
#   install.sh unpacks to /opt/comercium and restarts the preconfigured service.

## 5. Verify
#   systemctl status comercium
#   journalctl -u comercium -f
#   curl -s https://example.com/login | head -c 200

## Notes
# - Fresh start: delete /opt/comercium/data, then the /onboarding flow creates
#   the first tenant + admin on first visit.
# - Production data remains on the VPS and is never copied into the artifact.
#   Master and existing tenant databases apply pending migrations on startup;
#   migration errors prevent the new service from starting.
# - Backups: copy deploy/backup.sh to /opt/comercium/backup.sh and add a cron job:
#       0 2 * * * /opt/comercium/backup.sh
#   Backups land in /opt/comercium/backups/. Move them off-box (rclone/restic)
#   for real safety.
# - Upgrading: rebuild + re-run build-release.sh, scp, then on the VPS:
#       sudo systemctl stop comercium
#       sudo tar -xzf /tmp/comercium-release.tar.gz -C /opt/comercium
#       sudo chmod +x /opt/comercium/comercium
#       sudo systemctl start comercium
#   (data/ and backups/ are preserved — the release replaces comercium, web/,
#    drizzle/, and the versioned help-document directory.)

## 6. Automatic deploys on push to main (GitHub Actions)
#   .github/workflows/deploy.yml builds an ARM64 release and redeploys on every
#   push to `main` (and via the "Run workflow" button). It:
#     1. Checks out the repo on an ARM64 runner, builds inside Oracle Linux 9,
#        and runs ./deploy/build-release.sh
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
#                    If omitted, the workflow falls back to ssh-keyscan during
#                    deployment (weaker — host key is not pinned).
#   To grab the host key for the secret:
#     ssh-keyscan -t ed25519 <VPS_HOST>
