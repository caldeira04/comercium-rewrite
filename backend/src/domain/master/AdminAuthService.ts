import { db } from "@/db/db"
import { adminSession, adminUser } from "@/db/schema/master/admin"
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "../../utils/auth"
import { AppError } from "../../utils/errors"
import { audit } from "../../utils/audit"
import { asc, count, eq } from "drizzle-orm"

export type AdminRole = "owner" | "admin"

export type AdminAuth = {
    adminId: string
    name: string
    login: string
    role: AdminRole
    tenantId: null
    tenantSlug: null
    tenantName: null
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

export async function adminAuthStatus() {
    const [row] = await db.select({ total: count() }).from(adminUser)
    const adminCount = row?.total ?? 0
    return {
        isSetup: adminCount > 0,
        adminCount,
    }
}

export async function bootstrapAdmin(data: {
    name: string
    login: string
    password: string
}) {
    const existing = await db.select({ id: adminUser.id }).from(adminUser).limit(1)
    if (existing.length > 0) {
        throw new AppError("sistema administrativo já configurado", 409, "ADMIN_ALREADY_SETUP")
    }

    const [created] = await db.insert(adminUser).values({
        name: data.name,
        login: data.login,
        passwordHash: await hashPassword(data.password),
        role: "owner",
    }).returning({ id: adminUser.id, name: adminUser.name, login: adminUser.login })

    if (!created) throw new AppError("erro ao criar administrador", 500, "ADMIN_CREATE_FAILED")

    await audit({
        action: "admin.bootstrap",
        targetType: "admin_user",
        targetId: created.id,
        metadata: { login: created.login, role: "owner" },
    })

    return created
}

export async function loginAdmin(login: string, password: string) {
    const [user] = await db.select().from(adminUser).where(eq(adminUser.login, login)).limit(1)

    if (!user || !user.isActive) {
        throw new AppError("credenciais inválidas", 401, "ADMIN_INVALID_CREDENTIALS")
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
        throw new AppError("credenciais inválidas", 401, "ADMIN_INVALID_CREDENTIALS")
    }

    const token = generateSessionToken()
    const tokenHash = await hashToken(token)

    await db.insert(adminSession).values({
        adminUserId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    })

    await audit({
        adminUserId: user.id,
        action: "admin.login",
        targetType: "admin_user",
        targetId: user.id,
    })

    return token
}

export async function validateAdminSession(token: string): Promise<AdminAuth | null> {
    const tokenHash = await hashToken(token)

    const result = await db
        .select({
            sessionId: adminSession.id,
            expiresAt: adminSession.expiresAt,
            adminId: adminUser.id,
            name: adminUser.name,
            login: adminUser.login,
            role: adminUser.role,
        })
        .from(adminSession)
        .innerJoin(adminUser, eq(adminSession.adminUserId, adminUser.id))
        .where(eq(adminSession.tokenHash, tokenHash))
        .limit(1)

    const current = result[0]
    if (!current) return null
    if (new Date(current.expiresAt) < new Date()) return null

    return {
        adminId: current.adminId,
        name: current.name,
        login: current.login,
        role: current.role as AdminRole,
        tenantId: null,
        tenantSlug: null,
        tenantName: null,
    }
}

export async function listAdmins() {
    return await db.query.adminUser.findMany({
        columns: {
            id: true,
            name: true,
            login: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: [asc(adminUser.createdAt)],
    })
}

export async function createAdmin(data: {
    name: string
    login: string
    password: string
    role: AdminRole
}, actorId: string) {
    const [created] = await db.insert(adminUser).values({
        name: data.name,
        login: data.login,
        passwordHash: await hashPassword(data.password),
        role: data.role,
    }).returning({ id: adminUser.id, login: adminUser.login, role: adminUser.role })

    if (!created) throw new AppError("erro ao criar administrador", 500, "ADMIN_CREATE_FAILED")

    await audit({
        adminUserId: actorId,
        action: "admin.create",
        targetType: "admin_user",
        targetId: created.id,
        metadata: { login: created.login, role: created.role },
    })

    return created
}

export async function updateAdmin(adminId: string, data: {
    name?: string
    role?: AdminRole
    isActive?: boolean
    password?: string
}, actorId: string) {
    const target = await db.query.adminUser.findFirst({ where: (u, { eq }) => eq(u.id, adminId) })
    if (!target) throw new AppError("administrador não encontrado", 404, "ADMIN_NOT_FOUND")

    const changes: Record<string, unknown> = {}

    if (data.role && data.role !== target.role) {
        if (target.role === "owner" && data.role !== "owner") {
            const owners = await db.select({ id: adminUser.id }).from(adminUser).where(eq(adminUser.role, "owner"))
            if (owners.length <= 1) {
                throw new AppError("não é possível remover o único owner", 400, "ADMIN_LAST_OWNER")
            }
        }
        changes.role = data.role
    }
    if (data.name !== undefined && data.name !== target.name) changes.name = data.name
    if (data.isActive !== undefined && data.isActive !== target.isActive) {
        if (target.role === "owner" && data.isActive === false) {
            const owners = await db.select({ id: adminUser.id }).from(adminUser).where(eq(adminUser.role, "owner"))
            if (owners.length <= 1) {
                throw new AppError("não é possível desativar o único owner", 400, "ADMIN_LAST_OWNER")
            }
        }
        changes.isActive = data.isActive
    }
    if (data.password) changes.passwordHash = await hashPassword(data.password)

    if (Object.keys(changes).length === 0) return target

    const [updated] = await db.update(adminUser).set(changes).where(eq(adminUser.id, adminId)).returning({
        id: adminUser.id,
        name: adminUser.name,
        login: adminUser.login,
        role: adminUser.role,
        isActive: adminUser.isActive,
    })

    await audit({
        adminUserId: actorId,
        action: "admin.update",
        targetType: "admin_user",
        targetId: adminId,
        metadata: { changes: Object.keys(changes) },
    })

    return updated
}

export async function deleteAdmin(adminId: string, actorId: string) {
    if (adminId === actorId) {
        throw new AppError("não é possível remover o próprio usuário", 400, "ADMIN_CANNOT_DELETE_SELF")
    }

    const target = await db.query.adminUser.findFirst({ where: (u, { eq }) => eq(u.id, adminId) })
    if (!target) throw new AppError("administrador não encontrado", 404, "ADMIN_NOT_FOUND")

    if (target.role === "owner") {
        const owners = await db.select({ id: adminUser.id }).from(adminUser).where(eq(adminUser.role, "owner"))
        if (owners.length <= 1) {
            throw new AppError("não é possível remover o único owner", 400, "ADMIN_LAST_OWNER")
        }
    }

    await db.delete(adminUser).where(eq(adminUser.id, adminId))

    await audit({
        adminUserId: actorId,
        action: "admin.delete",
        targetType: "admin_user",
        targetId: adminId,
        metadata: { login: target.login },
    })

    return { ok: true }
}