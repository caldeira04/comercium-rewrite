import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import path from "node:path"

const connections = new Map<string, ReturnType<typeof drizzle>>()

function getDbPath(tenantId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
        throw new Error("Invalid tenant id")
    }

    return path.join(process.cwd(), "data", "tenants", `${tenantId}.sqlite`)
}

export function getTenantDb(tenantId: string) {
    const existing = connections.get(tenantId)
    if (existing) return existing

    const sqlite = new Database(getDbPath(tenantId))
    const db = drizzle(sqlite)

    connections.set(tenantId, db)

    return db
}

const master = new Database("./master.db")
export const db = drizzle(master)
