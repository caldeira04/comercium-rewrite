import path from "node:path"
import { AppError } from "../utils/errors"

export function getDataDir() {
    return path.resolve(process.env.COMERCIUM_DATA_DIR ?? path.join(process.cwd(), "data"))
}

export function getTenantsDir() {
    return path.join(getDataDir(), "tenants")
}

export function getMasterDbPath() {
    return path.join(getDataDir(), "master.sqlite")
}

export function getTenantDbPath(tenantSlug: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantSlug)) {
        throw new AppError("identificador do tenant inválido", 400, "INVALID_TENANT_ID")
    }

    return path.join(getTenantsDir(), `${tenantSlug}.sqlite`)
}

export function getTenantMigrationsDir() {
    return path.resolve(process.env.COMERCIUM_TENANT_MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle", "migrations", "tenant"))
}

export function getMasterMigrationsDir() {
    return path.resolve(process.env.COMERCIUM_MASTER_MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle", "migrations", "master"))
}
