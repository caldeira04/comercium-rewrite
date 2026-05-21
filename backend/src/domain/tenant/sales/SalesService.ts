import { getTenantDb } from "@/db/db";
import { sale } from "@/db/schema/tenant/sale"

export async function createSale(tenantSlug: string, data: {
    clientId: number
    totalAmount?: number
    settledAt?: string | null
    createdByUserId?: string | null
}) {
    const db = getTenantDb(tenantSlug)

    const [newSale] = await db.insert(sale).values({
        clientId: data.clientId,
        totalAmount: data.totalAmount ?? 0,
        settledAt: data.settledAt,
        createdByUserId: data.createdByUserId,
    }).returning()

    return newSale
}
