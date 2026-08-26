import { db } from "@/db/db"
import { announcement } from "@/db/schema/master/admin"
import { AppError } from "../../utils/errors"
import { audit } from "../../utils/audit"
import { desc, eq } from "drizzle-orm"

export async function listAnnouncements() {
    return await db.query.announcement.findMany({ orderBy: [desc(announcement.createdAt)] })
}

export async function createAnnouncement(data: {
    title: string
    body: string
    scope: "global" | "tenant"
    tenantId?: string | null
    isActive?: boolean
    startsAt?: string | null
    endsAt?: string | null
}, actorId: string) {
    const [created] = await db.insert(announcement).values({
        title: data.title,
        body: data.body,
        scope: data.scope,
        tenantId: data.tenantId ?? null,
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        createdByAdminId: actorId,
    }).returning()

    await audit({
        adminUserId: actorId,
        action: "announcement.create",
        targetType: "announcement",
        targetId: created.id,
        tenantId: data.tenantId ?? null,
        metadata: { title: created.title, scope: created.scope },
    })

    return created
}

export async function updateAnnouncement(announcementId: string, data: {
    title?: string
    body?: string
    scope?: "global" | "tenant"
    tenantId?: string | null
    isActive?: boolean
    startsAt?: string | null
    endsAt?: string | null
}, actorId: string) {
    const target = await db.query.announcement.findFirst({ where: (a, { eq }) => eq(a.id, announcementId) })
    if (!target) throw new AppError("anúncio não encontrado", 404, "ANNOUNCEMENT_NOT_FOUND")

    const [updated] = await db.update(announcement).set(data).where(eq(announcement.id, announcementId)).returning()

    await audit({
        adminUserId: actorId,
        action: "announcement.update",
        targetType: "announcement",
        targetId: announcementId,
        tenantId: data.tenantId ?? null,
        metadata: { title: updated.title, scope: updated.scope, isActive: updated.isActive },
    })

    return updated
}

export async function deleteAnnouncement(announcementId: string, actorId: string) {
    const target = await db.query.announcement.findFirst({ where: (a, { eq }) => eq(a.id, announcementId) })
    if (!target) throw new AppError("anúncio não encontrado", 404, "ANNOUNCEMENT_NOT_FOUND")

    await db.delete(announcement).where(eq(announcement.id, announcementId))

    await audit({
        adminUserId: actorId,
        action: "announcement.delete",
        targetType: "announcement",
        targetId: announcementId,
        tenantId: target.tenantId,
        metadata: { title: target.title },
    })

    return { ok: true }
}