import path from "node:path"
import { existsSync, readFileSync } from "node:fs"
import { createApp } from "./app"

export type { App } from "./app"

// Bun only auto-loads `.env` from the process cwd, so a binary launched from the
// repo root would miss backend/.env.local. Merge a conventional env file into
// process.env without overriding variables that are already set.
function loadLocalEnv() {
    const execDir = path.dirname(process.execPath)
    const candidates = [
        path.resolve(process.cwd(), "backend", ".env.local"),
        path.resolve(execDir, "..", "backend", ".env.local"),
        path.resolve(execDir, "backend", ".env.local"),
        path.resolve(execDir, ".env.local"),
    ]

    for (const file of candidates) {
        if (!existsSync(file)) continue

        const content = readFileSync(file, "utf8")
        const envDir = path.dirname(file)

        for (const line of content.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith("#")) continue

            const eq = trimmed.indexOf("=")
            if (eq === -1) continue

            const key = trimmed.slice(0, eq).trim()
            let value = trimmed.slice(eq + 1).trim()

            if (key.startsWith("COMERCIUM_") && value && !path.isAbsolute(value)) {
                value = path.resolve(envDir, value)
            }

            if (!(key in process.env)) {
                process.env[key] = value
            }
        }

        console.log(`📄 Loaded env from ${file}`)
        return
    }
}

loadLocalEnv()

const port = Number(process.env.PORT ?? 3000)
const corsOrigin = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
const app = createApp({ corsOrigin }).listen(port)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)

const webDir = process.env.COMERCIUM_WEB_DIR
if (webDir) {
    try {
        const serverEntry = path.resolve(webDir, "server", "index.mjs")
        await import(serverEntry)
        console.log(`🌐 Frontend server loaded from ${serverEntry}`)
    } catch (error) {
        console.error("Failed to load frontend server:", error)
    }
}