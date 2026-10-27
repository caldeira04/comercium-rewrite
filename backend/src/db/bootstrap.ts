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
        migrateTenantDatabases(tenantMigrationsDir)
    }

    return sqlite
}

function migrateTenantDatabases(migrationsFolder: string, onMigrated?: (file: string) => void) {
    const tenantsDir = getTenantsDir()
    const tenantFiles = readdirSync(tenantsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))

    for (const file of tenantFiles) {
        const tenantSqlite = new Database(path.join(tenantsDir, file.name))
        try {
            migrate(drizzle(tenantSqlite), { migrationsFolder })
        } finally {
            tenantSqlite.close()
        }
        onMigrated?.(file.name)
    }

    return tenantFiles.length
}

// Used by `comercium --migrate` during deploys: unlike the startup path, it
// fails when the migration folders are missing instead of skipping them.
export function migrateAllDatabases() {
    const masterMigrationsDir = getMasterMigrationsDir()
    const tenantMigrationsDir = getTenantMigrationsDir()

    for (const dir of [masterMigrationsDir, tenantMigrationsDir]) {
        if (!existsSync(dir)) {
            throw new Error(`pasta de migrations não encontrada: ${dir}`)
        }
    }

    ensureDataDirectories()

    const master = new Database(getMasterDbPath())
    try {
        master.exec("PRAGMA foreign_keys = ON")
        migrate(drizzle(master), { migrationsFolder: masterMigrationsDir })
    } finally {
        master.close()
    }
    console.log("OK: master.sqlite")

    const count = migrateTenantDatabases(tenantMigrationsDir, (file) => console.log(`OK: tenants/${file}`))
    console.log(`${count} tenant(s) migrado(s).`)
}
