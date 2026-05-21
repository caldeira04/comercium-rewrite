import { db } from "@/db/db"
import { session, tenantUser } from "@/db/schema/master/auth"
import { tenant } from "@/db/schema/master/tenant"
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "@/utils/auth"
import { and, eq, isNull } from "drizzle-orm"
import path from "node:path"
import { existsSync, mkdirSync } from "node:fs"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"

export async function signUp(
    tenantSlug: string,
    document: string,
    email: string,
    name: string,
    phone: string,
    password: string,
) {
    const masterDir = path.join(process.cwd(), "data")
    const masterDbPath = path.join(masterDir, "master.sqlite")
    const tenantsDir = path.join(process.cwd(), "data", "tenants")
    const dbPath = path.join(tenantsDir, `${tenantSlug}.sqlite`)
    const migrationsFolder = path.join(process.cwd(), "drizzle", "migrations", "tenant")

    if (!existsSync(tenantsDir)) {
        mkdirSync(tenantsDir, { recursive: true })
    }

    if (existsSync(dbPath)) {
        throw new Error(`DB do tenant já existe: ${dbPath}`)
    }

    const sqlite = new Database(dbPath)
    const masterSqlite = new Database(masterDbPath)
    const tenantDb = drizzle(sqlite)
    const masterDb = drizzle(masterSqlite)

    migrate(tenantDb, {
        migrationsFolder,
    })

    const createdTenant = await masterDb.insert(tenant).values({
        slug: String(tenantSlug),
        document,
        email,
        name,
        phone,
    }).returning({ id: tenant.id })

    if (!createdTenant) throw new Error("Erro ao criar nova loja")

    const exampleUser = await masterDb.insert(tenantUser).values({
        login: email,
        password: await hashPassword(password),
        tenantId: createdTenant[0].id
    }).returning({ id: tenantUser.id })

    if (!exampleUser) throw new Error("Erro ao criar usuário em nova loja")

    const token = generateSessionToken()
    const tokenHash = await hashToken(token)

    await db.insert(session).values({
        tenantUserId: exampleUser[0].id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        createdAt: new Date().toISOString()
    })

    return token
}

export async function login(tenantSlug: string, username: string, password: string) {
    const [user] = await db
        .select({
            id: tenantUser.id,
            login: tenantUser.login,
            password: tenantUser.password,
            tenantId: tenantUser.tenantId,
        })
        .from(tenantUser)
        .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
        .where(and(
            eq(tenant.slug, tenantSlug),
            eq(tenant.isActive, true),
            isNull(tenant.deletedAt),
            eq(tenantUser.login, username),
        ))
        .limit(1)

    if (!user) {
        throw new Error("Invalid Credentials")
    }

    const validPassword = await verifyPassword(password, user.password)

    if (!validPassword) {
        throw new Error("Invalid Credentials")
    }

    const token = generateSessionToken()
    const tokenHash = await hashToken(token)

    await db.insert(session).values({
        tenantUserId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        createdAt: new Date().toISOString()
    })

    return token
}

export async function validateSession(token: string) {
    const tokenHash = await hashToken(token)

    const result = await db
        .select({
            sessionId: session.id,
            expiresAt: session.expiresAt,

            userId: tenantUser.id,
            login: tenantUser.login,
            tenantId: tenantUser.tenantId,
            tenantSlug: tenant.slug,
        })
        .from(session)
        .innerJoin(
            tenantUser,
            eq(session.tenantUserId, tenantUser.id)
        )
        .innerJoin(
            tenant,
            eq(tenantUser.tenantId, tenant.id)
        )
        .where(and(
            eq(session.tokenHash, tokenHash),
            eq(tenant.isActive, true),
            isNull(tenant.deletedAt),
        ))
        .limit(1)

    const currentSession = result[0]

    if (!currentSession) {
        return null
    }

    if (new Date(currentSession.expiresAt) < new Date()) {
        return null
    }

    return currentSession
}
