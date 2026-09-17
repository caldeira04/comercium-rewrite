import { cancelSaleNfce, emitSaleNfce, getSaleFiscalDocument, listTenantFiscalDocuments, refreshSaleNfce } from "@/domain/tenant/fiscal/FiscalService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const fiscal = new Elysia({ prefix: "/fiscal" })
    .use(authPlugin)

    .get("/nfce", async ({ auth, query }) => {
        return await listTenantFiscalDocuments(auth.tenantSlug, {
            status: query.status,
            page: query.page ? Number(query.page) : undefined,
            pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        })
    }, {
        query: t.Partial(t.Object({
            status: t.String(),
            page: t.String(),
            pageSize: t.String(),
        }))
    })

    .get("/nfce/:saleId", async ({ auth, params }) => {
        const document = await getSaleFiscalDocument(auth.tenantSlug, params.saleId)
        if (!document) return { document: null }
        return { document }
    }, {
        params: t.Object({ saleId: t.String() })
    })

    .post("/nfce/:saleId/emit", async ({ auth, params }) => {
        return await emitSaleNfce(auth.tenantSlug, params.saleId, { userId: auth.userId })
    }, {
        params: t.Object({ saleId: t.String() })
    })

    .post("/nfce/:saleId/refresh", async ({ auth, params }) => {
        return await refreshSaleNfce(auth.tenantSlug, params.saleId)
    }, {
        params: t.Object({ saleId: t.String() })
    })

    .delete("/nfce/:saleId", async ({ auth, params, body }) => {
        return await cancelSaleNfce(auth.tenantSlug, params.saleId, body.justificativa, { userId: auth.userId })
    }, {
        params: t.Object({ saleId: t.String() }),
        body: t.Object({ justificativa: t.String({ minLength: 15, maxLength: 255 }) })
    })

export default fiscal
