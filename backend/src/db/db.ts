import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { existsSync } from "node:fs"
import path from "node:path"
import * as masterSchema from "@/db/schema/master"
import * as tenantSchema from "@/db/schema/tenant"

const dataDir = path.resolve(import.meta.dir, "..", "..", "data")
const tenantsDir = path.join(dataDir, "tenants")
const masterDbPath = path.join(dataDir, "master.sqlite")

const connections = new Map<string, ReturnType<typeof drizzle<typeof tenantSchema>>>()

function getDbPath(tenantId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
        throw new Error("Invalid tenant id")
    }

    return path.join(tenantsDir, `${tenantId}.sqlite`)
}

export function getTenantDb(tenantSlug: string) {
    const existing = connections.get(tenantSlug)
    if (existing) return existing

    const dbPath = getDbPath(tenantSlug)

    if (!existsSync(dbPath)) {
        throw new Error(`Tenant database not found for tenant "${tenantSlug}"`)
    }

    const sqlite = new Database(dbPath)
    sqlite.exec("PRAGMA foreign_keys = ON")

    const db = drizzle(sqlite, { schema: tenantSchema })

    connections.set(tenantSlug, db)

    return db
}

if (!existsSync(masterDbPath)) {
    throw new Error(`Master database not found at ${masterDbPath}. Run the master migration first.`)
}

const master = new Database(masterDbPath)
master.exec("PRAGMA foreign_keys = ON")

export const db = drizzle(master, { schema: masterSchema })
