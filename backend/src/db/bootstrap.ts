import { existsSync, mkdirSync } from "node:fs"
import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { getDataDir, getMasterDbPath, getMasterMigrationsDir, getTenantsDir } from "@/config/paths"

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

    return sqlite
}
