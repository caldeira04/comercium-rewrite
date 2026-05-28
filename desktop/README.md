# Comercium Desktop

This workspace is the initial desktop scaffold for the offline-first native app.

Current status:

- Resolves a desktop data directory (platform-specific or via `COMERCIUM_DATA_DIR`).
- Starts the backend with proper environment config.
- Reserves `http://127.0.0.1:3100` as the desktop local API URL.
- Opens a native Electrobun `BrowserWindow` pointed at the frontend URL.
- Passes the local API URL through the frontend query string as `apiBaseUrl`.
- First-run onboarding flow: detects fresh install and redirects to `/onboarding`.
- Onboarding endpoint creates tenant, admin user, and tenant DB in one call.

Development workflow:

```sh
# Terminal 1: Start frontend dev server (Vite on port 5173)
bun run --cwd desktop dev:frontend

# Terminal 2: Start desktop app with backend + native window
bun run --cwd desktop dev
```

The desktop app will:
1. Start the local backend on `http://127.0.0.1:3100`
2. Open a BrowserWindow pointing to `http://localhost:5173?apiBaseUrl=http://127.0.0.1:3100`
3. Frontend detects no setup and redirects to `/onboarding`
4. User completes onboarding form, which calls `POST /master/onboarding/setup`
5. Backend creates tenant, admin user, DB, and logs the user in automatically
6. User is redirected to dashboard

Production build:

```sh
bun run --cwd desktop build:native
```

This will:
1. Build the frontend to `.output/public`
2. Build the desktop app with Electrobun (includes built assets)
3. In production, frontend assets are served from embedded HTTP server

The built app is located at: `desktop/build/<platform>-<arch>/Comercium/`

**Platform-specific locations:**
- **Linux x64**: `desktop/build/linux-x64/Comercium/bin/launcher`
- **macOS x64/arm64**: `desktop/build/macos-x64/Comercium.app/Contents/MacOS/launcher` (or `macos-arm64`)
- **Windows x64**: `desktop/build/windows-x64/Comercium/Comercium.exe`

Run the app:
```sh
# Linux
./desktop/build/linux-x64/Comercium/bin/launcher

# macOS
./desktop/build/macos-x64/Comercium.app/Contents/MacOS/launcher

# Windows
./desktop/build/windows-x64/Comercium/Comercium.exe
```

Notes:

- Data is stored in platform-specific locations: `~/Library/Application Support/Comercium` (macOS), `%APPDATA%/Comercium` (Windows), `~/.local/share/comercium` (Linux).
- Override data location with `COMERCIUM_DATA_DIR` env var.
- Master DB (`master.sqlite`) stores tenants and auth.
- Tenant DBs (`data/tenants/*.sqlite`) store per-tenant business data.
- All routes require auth except `/master/auth/login`, `/master/auth/signup`, and `/master/onboarding/*`.

