import { getTenantDb } from "@/db/db";
import { client } from "@/db/schema/tenant/client"
import { desc, eq, isNull, sql } from "drizzle-orm";

export async function createClient(tenantSlug: string, data: {
    name: string
    document?: string
    email?: string
    phone?: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { name, document, email, phone, userId } = data

    const [newClient] = await db.insert(client).values({
        name,
        document,
        email,
        phone,
        createdByUserId: userId,
        updatedByUserId: userId
    }).returning()

    return newClient
}

export async function editClient(tenantSlug: string, data: {
    clientId: number
    name?: string
    document?: string
    email?: string
    phone?: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { clientId, name, document, email, phone, userId } = data

    if (!clientId) throw new Error("não é possível editar o cliente \"Consumidor Final\"")

    const [updatedClient] = await db.update(client).set({
        name,
        document,
        email,
        phone,
        updatedByUserId: userId
    })
        .where(eq(client.id, clientId))
        .returning()

    return updatedClient
}

export async function getClients(tenantSlug: string, includeDeleted?: boolean) {
    const db = getTenantDb(tenantSlug)
    const conditions = []
    if (!includeDeleted) {
        conditions.push(isNull(client.deletedAt))
    }

    const clients = await db.query.client.findMany({
        columns: {
            id: true,
            name: true,
            document: true,
            email: true,
            phone: true
        },
        where: includeDeleted
            ? undefined
            : (client, { isNull }) =>
                isNull(client.deletedAt),

        orderBy: [desc(client.createdAt)]
    })

    return clients
}

export async function deleteClient(tenantSlug: string, clientId: number, userId: string) {
    const db = getTenantDb(tenantSlug)

    const deleted = await db.update(client).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedByUserId: userId
    })
        .where(eq(client.id, clientId))
        .returning({ deleted_at: client.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}
