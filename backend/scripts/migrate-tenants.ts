import { readdirSync, existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"

const tenantsDir = path.join(process.cwd(), "data", "tenants")
const migrationsFolder = path.join(process.cwd(), "drizzle", "migrations", "tenant")

if (!existsSync(tenantsDir)) {
    mkdirSync(tenantsDir, { recursive: true })
}

const tenantDbFiles = readdirSync(tenantsDir)
    .filter((file) => file.endsWith(".sqlite"))

if (tenantDbFiles.length === 0) {
    console.log("Nenhum tenant encontrado.")
    process.exit(0)
}

for (const file of tenantDbFiles) {
    const dbPath = path.join(tenantsDir, file)

    console.log(`Migrando ${file}...`)

    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)

    migrate(db, {
        migrationsFolder,
    })

    sqlite.close()

    console.log(`OK: ${file}`)
}

console.log("Todos os tenants migrados.")
