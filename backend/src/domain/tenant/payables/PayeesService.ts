import { getTenantDb } from "@/db/db"
import { payee } from "@/db/schema/tenant"
import { and, asc, eq, isNull } from "drizzle-orm"
import { AppError } from "../../../utils/errors"

export const payeeKinds = ["supplier", "employee", "other"] as const
export type PayeeKind = (typeof payeeKinds)[number]

type PayeeInput = {
    name: string
    kind?: PayeeKind
    document?: string | null
    phone?: string | null
    email?: string | null
}

function normalizeName(name?: string) {
    const value = name?.trim()

    if (!value) {
        throw new AppError("informe o nome do favorecido", 400, "INVALID_PAYEE_NAME")
    }

    return value
}

function normalizeKind(kind?: string | null) {
    if (!kind) return "supplier" as PayeeKind

    if (!payeeKinds.includes(kind as PayeeKind)) {
        throw new AppError("tipo de favorecido inválido", 400, "INVALID_PAYEE_KIND")
    }

    return kind as PayeeKind
}

function optionalText(value?: string | null) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
}

export async function getPayees(tenantSlug: string, options: { includeDeleted?: boolean } = {}) {
    const db = getTenantDb(tenantSlug)

    return await db
        .select({
            id: payee.id,
            name: payee.name,
            kind: payee.kind,
            document: payee.document,
            phone: payee.phone,
            email: payee.email,
            deletedAt: payee.deletedAt,
        })
        .from(payee)
        .where(options.includeDeleted ? undefined : isNull(payee.deletedAt))
        .orderBy(asc(payee.name))
}

export async function createPayee(tenantSlug: string, data: PayeeInput & { userId: string }) {
    const db = getTenantDb(tenantSlug)

    const [created] = await db.insert(payee).values({
        name: normalizeName(data.name),
        kind: normalizeKind(data.kind),
        document: optionalText(data.document),
        phone: optionalText(data.phone),
        email: optionalText(data.email),
        createdByUserId: data.userId,
        updatedByUserId: data.userId,
    }).returning()

    return created
}

export async function updatePayee(tenantSlug: string, data: {
    payeeId: string
    userId: string
    name?: string
    kind?: PayeeKind
    document?: string | null
    phone?: string | null
    email?: string | null
}) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.payee.findFirst({
        where: (payee, { and, eq, isNull }) => and(eq(payee.id, data.payeeId), isNull(payee.deletedAt)),
    })

    if (!existing) {
        throw new AppError("favorecido não encontrado", 404, "PAYEE_NOT_FOUND")
    }

    const [updated] = await db.update(payee).set({
        name: data.name === undefined ? existing.name : normalizeName(data.name),
        kind: data.kind === undefined ? existing.kind : normalizeKind(data.kind),
        document: data.document === undefined ? existing.document : optionalText(data.document),
        phone: data.phone === undefined ? existing.phone : optionalText(data.phone),
        email: data.email === undefined ? existing.email : optionalText(data.email),
        updatedByUserId: data.userId,
    }).where(eq(payee.id, data.payeeId)).returning()

    return updated
}

export async function deletePayee(tenantSlug: string, payeeId: string, userId: string) {
    const db = getTenantDb(tenantSlug)

    const [deleted] = await db.update(payee).set({
        deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        deletedByUserId: userId,
        updatedByUserId: userId,
    })
        .where(and(eq(payee.id, payeeId), isNull(payee.deletedAt)))
        .returning({ id: payee.id })

    if (!deleted) {
        throw new AppError("favorecido não encontrado", 404, "PAYEE_NOT_FOUND")
    }

    return { ok: true }
}
