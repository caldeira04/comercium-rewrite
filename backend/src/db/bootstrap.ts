import { existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"
import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import {
    getDataDir,
    getMasterDbPath,
    getMasterMigrationsDir,
    getTenantMigrationsDir,
    getTenantsDir,
} from "@/config/paths"

export function ensureDataDirectories() {
    mkdirSync(getDataDir(), { recursive: true })
    mkdirSync(getTenantsDir(), { recursive: true })
}

export function ensureMasterDatabase() {
    ensureDataDirectories()

    const masterDbPath = getMasterDbPath()
    const shouldMigrate = existsSync(getMasterMigrationsDir())
    const sqlite = new Database(masterDbPath)
    sqlite.exec("PRAGMA foreign_keys = ON")

    if (shouldMigrate) {
        migrate(drizzle(sqlite), {
            migrationsFolder: getMasterMigrationsDir(),
        })
    }

    const tenantMigrationsDir = getTenantMigrationsDir()
    if (existsSync(tenantMigrationsDir)) {
        const tenantsDir = getTenantsDir()
        const tenantFiles = readdirSync(tenantsDir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
        for (const file of tenantFiles) {
            const tenantSqlite = new Database(path.join(tenantsDir, file.name))
            try {
                migrate(drizzle(tenantSqlite), {
                    migrationsFolder: tenantMigrationsDir,
                })
            } finally {
                tenantSqlite.close()
            }
        }
    }

    return sqlite
}
