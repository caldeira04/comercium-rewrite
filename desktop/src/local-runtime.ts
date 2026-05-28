import { homedir } from "node:os"
import path from "node:path"

export const desktopBackendPort = Number(process.env.COMERCIUM_DESKTOP_BACKEND_PORT ?? 3100)
export const desktopFrontendPort = Number(process.env.COMERCIUM_DESKTOP_FRONTEND_PORT ?? 5174)
export const desktopApiBaseUrl = `http://127.0.0.1:${desktopBackendPort}`
export const desktopFrontendUrl = process.env.COMERCIUM_FRONTEND_URL ?? `http://localhost:${desktopFrontendPort}`
export const isDevelopment = process.env.NODE_ENV === "development" || !process.env.COMERCIUM_PACKAGED

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
    return {
        ...process.env,
        COMERCIUM_DATA_DIR: getDesktopDataDir(),
        PORT: String(desktopBackendPort),
        CORS_ORIGIN: desktopFrontendUrl,
    }
}

export function startLocalBackend() {
    return Bun.spawn({
        cmd: ["bun", "run", "src/index.ts"],
        cwd: path.resolve(import.meta.dir, "..", "..", "backend"),
        env: getDesktopBackendEnv(),
        stdout: "inherit",
        stderr: "inherit",
    })
}

export function getFrontendAssetsDir() {
    // In development, we don't need this; we use Vite dev server
    // In production, this would be the built frontend assets
    return path.join(import.meta.dir, "..", "..", "frontend", ".output", "public")
}

export function startFrontendServer() {
    if (isDevelopment) {
        // In development, we rely on Vite dev server running separately
        return null
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
