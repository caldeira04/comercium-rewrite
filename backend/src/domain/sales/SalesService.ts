import { getTenantDb } from "@/db/db";
import { sale } from "@/db/schema/sale"

export async function createSale(tenantId: string, data: {

}) {
    const db = getTenantDb(tenantId)

    const newSale = await db.insert(sale).values({
    })

}

