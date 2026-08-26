import { db } from "@/db/db"
import { featureFlag } from "@/db/schema/master/admin"
import { AppError } from "../../utils/errors"
import { audit } from "../../utils/audit"
import { asc, eq, and } from "drizzle-orm"

export async function listFlags() {
    return await db.query.featureFlag.findMany({ orderBy: [asc(featureFlag.key)] })
}

export async function createFlag(data: {
    key: string
    description?: string
    scope: "global" | "tenant"
    tenantId?: string | null
    enabled?: boolean
}, actorId: string) {
    const existing = await db.query.featureFlag.findFirst({
        where: (f, { and, eq }) => and(eq(f.key, data.key), eq(f.scope, data.scope), eq(f.tenantId, data.tenantId ?? ""))
    })
    if (existing) throw new AppError("flag já existe para este escopo", 409, "FLAG_EXISTS")

    const [created] = await db.insert(featureFlag).values({
        key: data.key,
        description: data.description,
        scope: data.scope,
        tenantId: data.tenantId ?? null,
        enabled: data.enabled ?? true,
    }).returning()

    await audit({
        adminUserId: actorId,
        action: "flag.create",
        targetType: "feature_flag",
        targetId: created.id,
        tenantId: data.tenantId ?? null,
        metadata: { key: created.key, scope: created.scope, enabled: created.enabled },
    })

    return created
}

export async function updateFlag(flagId: string, data: {
    key?: string
    description?: string
    scope?: "global" | "tenant"
    tenantId?: string | null
    enabled?: boolean
}, actorId: string) {
    const target = await db.query.featureFlag.findFirst({ where: (f, { eq }) => eq(f.id, flagId) })
    if (!target) throw new AppError("flag não encontrada", 404, "FLAG_NOT_FOUND")

    const [updated] = await db.update(featureFlag).set(data).where(eq(featureFlag.id, flagId)).returning()

    await audit({
        adminUserId: actorId,
        action: "flag.update",
        targetType: "feature_flag",
        targetId: flagId,
        tenantId: data.tenantId ?? null,
        metadata: { key: updated.key, scope: updated.scope, enabled: updated.enabled },
    })

    return updated
}

export async function deleteFlag(flagId: string, actorId: string) {
    const target = await db.query.featureFlag.findFirst({ where: (f, { eq }) => eq(f.id, flagId) })
    if (!target) throw new AppError("flag não encontrada", 404, "FLAG_NOT_FOUND")

    await db.delete(featureFlag).where(eq(featureFlag.id, flagId))

    await audit({
        adminUserId: actorId,
        action: "flag.delete",
        targetType: "feature_flag",
        targetId: flagId,
        tenantId: target.tenantId,
        metadata: { key: target.key, scope: target.scope },
    })

    return { ok: true }
}

export async function evaluateFlag(key: string, tenantId?: string) {
    const [tenantFlag] = await db.select({ enabled: featureFlag.enabled })
        .from(featureFlag)
        .where(and(eq(featureFlag.key, key), eq(featureFlag.scope, "tenant"), eq(featureFlag.tenantId, tenantId ?? "")))
        .limit(1)

    if (tenantFlag) return tenantFlag.enabled

    const [globalFlag] = await db.select({ enabled: featureFlag.enabled })
        .from(featureFlag)
        .where(and(eq(featureFlag.key, key), eq(featureFlag.scope, "global")))
        .limit(1)

    return globalFlag?.enabled ?? false
}