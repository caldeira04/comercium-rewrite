# Native Desktop And Offline Plan

## Goal

Make Comercium a local-first desktop ERP that runs fully offline, while keeping the current multi-tenant backend usable as an optional cloud service.

The preferred path is a desktop-only local app first, then cloud backup/sync later.

## Target Architecture

### Desktop Local Mode

- Electrobun opens the frontend in a native WebView.
- A bundled Bun/Elysia backend runs locally on `127.0.0.1`.
- The frontend talks to the local backend through the same Eden Treaty client.
- SQLite databases are stored in the OS app data directory.
- The app starts, sells, manages cash, clients, products, and stock without internet.

### Cloud Mode

- The same backend app can run as a hosted API.
- The existing master database + tenant database model remains useful for cloud multi-tenancy.
- Hosted users can use the web app or a desktop app connected to the cloud.

### Hybrid Mode

- The desktop app remains authoritative locally.
- Cloud is optional for backup, reporting, or multi-device sync.
- Sync happens in the background when internet is available.

## Runtime Modes

Add an explicit runtime mode concept:

- `local`: desktop/offline, local Elysia API, local SQLite.
- `cloud`: hosted frontend/API, hosted databases.
- `hybrid`: desktop local API with optional cloud sync.

The frontend must not hardcode `http://localhost:3000`. It should get the API base URL from runtime configuration.

## Local Data Directory

SQLite files must not live under source paths in packaged builds.

Use a configurable data directory:

- Development default: `backend/data`.
- Desktop override: `COMERCIUM_DATA_DIR`.
- Later Electrobun default:
  - Linux: `~/.local/share/comercium`.
  - macOS: `~/Library/Application Support/Comercium`.
  - Windows: `%APPDATA%/Comercium`.

Expected layout:

```txt
data/
  master.sqlite
  tenants/
    local.sqlite
  backups/
  logs/
```

## Backend Refactor

The backend must be embeddable:

- Export `createApp()` from `backend/src/app.ts`.
- Keep `backend/src/index.ts` as the server entrypoint that calls `.listen()`.
- Desktop can import `createApp()` and listen on a local port.
- Cloud can use the same app entrypoint.

## Local Bootstrap

Desktop startup should eventually perform:

1. Resolve app data directory.
2. Ensure directories exist.
3. Ensure `master.sqlite` exists.
4. Run master migrations.
5. Ensure local tenant exists.
6. Ensure tenant SQLite exists.
7. Run tenant migrations.
8. Create first local admin/store if missing.

The current implementation still expects migrated databases to exist. Full first-run bootstrap is a required follow-up before packaged desktop distribution.

## Authentication

Cloud auth and local auth should be separate concepts.

Local desktop:

- User can login offline.
- Session is local.
- PIN/password can be stored in local master DB.

Cloud:

- Uses hosted identity/session.
- Desktop can link a local store to a cloud account later.

## Multi-Tenancy

Cloud keeps multi-tenancy.

Desktop should default to one local tenant/store, but the current master DB + tenant DB layout can support multiple local stores if needed.

Recommended default tenant slug for standalone mode: `local`.

## Sync Plan

Do not start with full bidirectional sync. It is the hardest part.

Recommended phases:

1. Manual local backup/restore.
2. Cloud backup upload/download.
3. One-device cloud sync.
4. Multi-device sync.

Before real multi-device sync, add sync metadata:

- `deviceId`.
- stable UUID/public IDs for entities.
- `syncStatus`.
- `lastSyncedAt`.
- `serverVersion` or `version`.
- soft delete timestamps.

Important: integer IDs will collide between offline devices. Keep local integer IDs if useful, but add stable UUIDs for sync identity.

Financial data should prefer append-only records:

- sales
- payments
- stock movements
- cash movements
- cash closing events

Products and clients can initially use last-write-wins. Financial records need stricter conflict rules.

## Electrobun Package Shape

Proposed workspace:

```txt
desktop/
  package.json
  src/main.ts
  electrobun.config.ts
```

Desktop responsibilities:

- Resolve app data directory.
- Set `COMERCIUM_DATA_DIR`.
- Start local backend on `127.0.0.1`.
- Load frontend WebView.
- Inject API base URL.
- Later: printing, auto updates, backup/restore, native menus.

## Implementation Order

1. Runtime API config in frontend.
2. Embeddable backend `createApp()`.
3. Configurable backend data directory.
4. Desktop package scaffold.
5. First-run local bootstrap.
6. Native backup/restore.
7. Optional cloud connection.
8. Sync metadata and sync engine.

## Current Implementation Status

- `NATIVE.md` documents the target architecture.
- Backend is being refactored toward `createApp()`.
- Frontend API URL is being made runtime-configurable.
- Backend data path is being made configurable through `COMERCIUM_DATA_DIR`.
- Desktop package scaffold is the next step, but full packaged Electrobun distribution still needs dependency selection and first-run DB bootstrap.
