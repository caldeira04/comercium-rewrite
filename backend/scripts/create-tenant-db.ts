import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"

const tenantId = process.argv[2]

if (!tenantId) {
    throw new Error("Informe o tenantId. Ex: bun scripts/create-tenant-db.ts tenant_abc")
}

if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error("tenantId inválido")
}

const tenantsDir = path.join(process.cwd(), "data", "tenants")
const dbPath = path.join(tenantsDir, `${tenantId}.sqlite`)
const migrationsFolder = path.join(process.cwd(), "drizzle", "migrations", "tenant")

if (!existsSync(tenantsDir)) {
    mkdirSync(tenantsDir, { recursive: true })
}

if (existsSync(dbPath)) {
    throw new Error(`DB do tenant já existe: ${dbPath}`)
}

const sqlite = new Database(dbPath)
const db = drizzle(sqlite)

migrate(db, {
    migrationsFolder,
})

sqlite.close()

console.log(`Tenant DB criado: ${dbPath}`)
