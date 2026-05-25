import { db, getTenantDb } from "@/db/db"
import { product } from "@/db/schema/tenant"
import products from "@/utils/products.json"

async function main() {
    const tenantDb = getTenantDb("fullbeer")
    const user = await db.query.tenant.findFirst({
        where: (tenant, { eq }) => eq(tenant.slug, "fullbeer"),
        with: {
            tenantUsers: {
                columns: {
                    id: true
                }
            }
        }
    })

    await tenantDb.insert(product).values(products.map((p) => ({
        ...p,
        createdByUserId: user?.tenantUsers[0].id,
        updatedByUserId: user?.tenantUsers[0].id,
    })))

}

main()
