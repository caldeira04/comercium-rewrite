import { homedir } from "node:os"
import { existsSync } from "node:fs"
import path from "node:path"

export const desktopBackendPort = Number(process.env.COMERCIUM_DESKTOP_BACKEND_PORT ?? 3100)
export const desktopFrontendPort = Number(process.env.COMERCIUM_DESKTOP_FRONTEND_PORT ?? 5174)
export const desktopApiBaseUrl = `http://127.0.0.1:${desktopBackendPort}`
export const desktopFrontendUrl = process.env.COMERCIUM_FRONTEND_URL ?? `http://localhost:${desktopFrontendPort}`
type RuntimeProcess = Bun.Subprocess | ReturnType<typeof Bun.serve> | null

const packagedAppRoot = path.resolve(import.meta.dir, "..")
const packagedBackendEntrypoint = path.join(packagedAppRoot, "backend", "index.js")
const packagedFrontendEntrypoint = path.join(packagedAppRoot, "frontend", "server", "index.mjs")
const packagedMigrationsDir = path.join(packagedAppRoot, "backend", "drizzle", "migrations")
const workspaceRoot = findWorkspaceRoot()
const sourceBackendDir = workspaceRoot ? path.join(workspaceRoot, "backend") : null
const sourceBackendEntrypoint = sourceBackendDir ? path.join(sourceBackendDir, "src", "index.ts") : null
const sourceMigrationsDir = sourceBackendDir ? path.join(sourceBackendDir, "drizzle", "migrations") : null
const useExternalFrontend = Boolean(process.env.COMERCIUM_FRONTEND_URL)
const isPackagedRuntime = existsSync(packagedBackendEntrypoint) && existsSync(packagedFrontendEntrypoint)

export function getDesktopDataDir() {
    if (process.env.COMERCIUM_DATA_DIR) return path.resolve(process.env.COMERCIUM_DATA_DIR)

    switch (process.platform) {
        case "darwin":
            return path.join(homedir(), "Library", "Application Support", "Comercium")
        case "win32":
            return path.join(process.env.APPDATA ?? homedir(), "Comercium")
        default:
            return path.join(process.env.XDG_DATA_HOME ?? path.join(homedir(), ".local", "share"), "comercium")
    }
}

export function getDesktopBackendEnv() {
    const migrationsDir = isPackagedRuntime ? packagedMigrationsDir : sourceMigrationsDir

    return {
        ...process.env,
        COMERCIUM_DATA_DIR: getDesktopDataDir(),
        PORT: String(desktopBackendPort),
        CORS_ORIGIN: desktopFrontendUrl,
        ...(migrationsDir ? {
            COMERCIUM_MASTER_MIGRATIONS_DIR: path.join(migrationsDir, "master"),
            COMERCIUM_TENANT_MIGRATIONS_DIR: path.join(migrationsDir, "tenant"),
        } : {}),
    }
}

export function startLocalBackend() {
    const command = isPackagedRuntime
        ? [process.execPath, packagedBackendEntrypoint]
        : ["bun", "run", "src/index.ts"]
    const cwd = isPackagedRuntime ? path.dirname(packagedBackendEntrypoint) : sourceBackendDir

    if (!cwd || (!isPackagedRuntime && !sourceBackendEntrypoint) || (!isPackagedRuntime && !existsSync(sourceBackendEntrypoint!))) {
        throw new Error("Could not locate backend entrypoint for desktop runtime")
    }

    console.log(`Comercium backend cwd: ${cwd}`)

    return Bun.spawn({
        cmd: command,
        cwd,
        env: getDesktopBackendEnv(),
        stdout: "inherit",
        stderr: "inherit",
    })
}

export function getFrontendAssetsDir() {
    return path.join(packagedAppRoot, "frontend", "public")
}

export function startFrontendServer() {
    if (useExternalFrontend) {
        return null
    }

    if (existsSync(packagedFrontendEntrypoint)) {
        console.log(`Comercium frontend server entrypoint: ${packagedFrontendEntrypoint}`)

        return Bun.spawn({
            cmd: [process.execPath, packagedFrontendEntrypoint],
            cwd: path.dirname(packagedFrontendEntrypoint),
            env: {
                ...process.env,
                HOST: "127.0.0.1",
                PORT: String(desktopFrontendPort),
            },
            stdout: "inherit",
            stderr: "inherit",
        })
    }

    const assetsDir = getFrontendAssetsDir()
    const frontendServer = Bun.serve({
        port: desktopFrontendPort,
        async fetch(req) {
            const url = new URL(req.url)
            let filePath = path.join(assetsDir, url.pathname === "/" ? "index.html" : url.pathname)

            // Try to serve the file
            try {
                const file = Bun.file(filePath)
                if (await file.exists()) {
                    return new Response(file, {
                        headers: {
                            "Content-Type": getMimeType(filePath),
                            "Cache-Control": "public, max-age=3600",
                        },
                    })
                }
            } catch {}

            // Fallback to index.html for SPA routing
            try {
                const indexFile = Bun.file(path.join(assetsDir, "index.html"))
                if (await indexFile.exists()) {
                    return new Response(indexFile, {
                        headers: { "Content-Type": "text/html" },
                    })
                }
            } catch {}

            return new Response("Not Found", { status: 404 })
        },
    })

    console.log(`Frontend server listening on http://localhost:${desktopFrontendPort}`)
    return frontendServer
}

export function stopRuntimeProcess(process: RuntimeProcess) {
    if (!process) return
    if ("kill" in process) {
        process.kill()
        return
    }
    process.stop()
}

function findWorkspaceRoot() {
    const candidates = [import.meta.dir, process.cwd()]

    for (const candidate of candidates) {
        let current = path.resolve(candidate)

        while (current !== path.dirname(current)) {
            if (existsSync(path.join(current, "backend", "src", "index.ts"))) {
                return current
            }

            current = path.dirname(current)
        }
    }

    return null
}

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
    }
    return mimeTypes[ext] || "application/octet-stream"
}

export function getDesktopFrontendUrl() {
    const url = new URL(desktopFrontendUrl)
    url.searchParams.set("apiBaseUrl", desktopApiBaseUrl)

    return url.toString()
}
