import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { existsSync } from "node:fs"
import * as masterSchema from "@/db/schema/master"
import * as tenantSchema from "@/db/schema/tenant"
import { getTenantDbPath } from "@/config/paths"
import { ensureMasterDatabase } from "@/db/bootstrap"
import { AppError } from "../utils/errors"

const connections = new Map<string, ReturnType<typeof drizzle<typeof tenantSchema>>>()

export function getTenantDb(tenantSlug: string) {
    const existing = connections.get(tenantSlug)
    if (existing) return existing

    const dbPath = getTenantDbPath(tenantSlug)

    if (!existsSync(dbPath)) {
        throw new AppError(`banco de dados do tenant "${tenantSlug}" não encontrado`, 404, "TENANT_DATABASE_NOT_FOUND")
    }

    const sqlite = new Database(dbPath)
    sqlite.exec("PRAGMA foreign_keys = ON")

    const db = drizzle(sqlite, { schema: tenantSchema })

    connections.set(tenantSlug, db)

    return db
}

const master = ensureMasterDatabase()
master.exec("PRAGMA foreign_keys = ON")

export const db = drizzle(master, { schema: masterSchema })
