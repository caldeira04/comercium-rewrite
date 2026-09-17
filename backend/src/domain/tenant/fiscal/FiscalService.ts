import { and, count, desc, eq, sql } from "drizzle-orm"
import { db, getTenantDb } from "@/db/db"
import { fiscalDocument } from "@/db/schema/tenant"
import { AppError } from "../../../utils/errors"
import { getFocusConfig } from "./focus-config"
import {
    buildNfcePayload,
    buildSaleRef,
    canReemitStatus,
    centsToReais,
    isFinalStatus,
    mapFocusStatus,
    mapPaymentMethod,
    mapSaleItemToNfceItem,
    onlyDigits,
} from "./nfce-mapper"
import { cancelNfceRequest, emitNfceRequest, getNfceRequest } from "./focus-client"
import type { FocusNfceResponse, LocalFiscalStatus } from "./nfce-types"

export type FiscalDocumentRow = typeof fiscalDocument.$inferSelect

function normalizeStatus(raw?: string): LocalFiscalStatus {
    return mapFocusStatus(raw)
}

function toDbFields(response: FocusNfceResponse, status: LocalFiscalStatus) {
    return {
        status,
        sefazCode: response.status_sefaz ? String(response.status_sefaz) : null,
        sefazMessage: response.mensagem_sefaz ? String(response.mensagem_sefaz).slice(0, 1000) : null,
        chaveNfe: response.chave_nfe ? String(response.chave_nfe) : null,
        numero: response.numero ? String(response.numero) : null,
        serie: response.serie ? String(response.serie) : null,
        xmlPath: response.caminho_xml_nota_fiscal ? String(response.caminho_xml_nota_fiscal) : null,
        danfePath: response.caminho_danfe ? String(response.caminho_danfe) : null,
        qrcodeUrl: response.qrcode_url ? String(response.qrcode_url) : null,
        consultaUrl: response.url_consulta_nf ? String(response.url_consulta_nf) : null,
        cancelXmlPath: response.caminho_xml_cancelamento ? String(response.caminho_xml_cancelamento) : null,
        cancelProtocolo: response.numero_protocolo ? String(response.numero_protocolo) : null,
        lastResponse: JSON.stringify(response).slice(0, 20000),
        updatedAt: sql`(CURRENT_TIMESTAMP)` as unknown as string,
    }
}

export async function getTenantEmitenteCnpj(tenantSlug: string): Promise<string> {
    const row = await db.query.tenant.findFirst({
        where: (t, { eq }) => eq(t.slug, tenantSlug),
        columns: { document: true },
    })

    const cnpj = onlyDigits(row?.document ?? "")
    if (cnpj.length !== 14) {
        throw new AppError("tenant sem CNPJ válido para emissão de NFC-e", 400, "INVALID_TENANT_CNPJ")
    }
    return cnpj
}

async function getSaleContext(tenantSlug: string, saleId: string) {
    const tdb = getTenantDb(tenantSlug)

    const selectedSale = await tdb.query.sale.findFirst({
        where: (s, { eq }) => eq(s.id, saleId),
    })
    if (!selectedSale) throw new AppError("venda não encontrada", 404, "SALE_NOT_FOUND")
    if (selectedSale.cancelledAt) throw new AppError("venda cancelada não pode gerar NFC-e", 409, "SALE_CANCELLED")
    if (!selectedSale.settledAt) throw new AppError("finalize a venda antes de emitir a NFC-e", 409, "SALE_NOT_SETTLED")

    const items = await tdb.query.saleItem.findMany({
        where: (i, { and, eq, isNull }) => and(eq(i.saleId, saleId), isNull(i.deletedAt)),
        with: { product: true },
    })
    if (items.length === 0) throw new AppError("venda sem itens não pode gerar NFC-e", 400, "SALE_WITHOUT_ITEMS")

    const payments = await tdb.query.payment.findMany({
        where: (p, { and, eq }) => and(eq(p.saleId, saleId), eq(p.status, "paid")),
    })
    if (payments.length === 0) throw new AppError("venda sem pagamento quitado não pode gerar NFC-e", 400, "SALE_WITHOUT_PAYMENTS")

    return { selectedSale, items, payments }
}

export async function getSaleFiscalDocument(tenantSlug: string, saleId: string): Promise<FiscalDocumentRow | null> {
    const tdb = getTenantDb(tenantSlug)
    const row = await tdb.query.fiscalDocument.findFirst({
        where: (f, { eq }) => eq(f.saleId, saleId),
        orderBy: [desc(fiscalDocument.createdAt)],
    })
    return row ?? null
}

export async function listTenantFiscalDocuments(
    tenantSlug: string,
    params: { status?: string; page?: number; pageSize?: number } = {},
) {
    const tdb = getTenantDb(tenantSlug)
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))

    const conditions = []
    if (params.status) conditions.push(eq(fiscalDocument.status, params.status as LocalFiscalStatus))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, [totalRow]] = await Promise.all([
        tdb.select().from(fiscalDocument).where(where).orderBy(desc(fiscalDocument.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
        tdb.select({ total: count() }).from(fiscalDocument).where(where),
    ])

    return {
        documents: rows,
        pagination: {
            page,
            pageSize,
            total: totalRow?.total ?? 0,
            totalPages: Math.ceil((totalRow?.total ?? 0) / pageSize),
        },
    }
}

export async function emitSaleNfce(
    tenantSlug: string,
    saleId: string,
    options: { userId: string; fetchImpl?: typeof fetch } = { userId: "" },
): Promise<FiscalDocumentRow> {
    const config = getFocusConfig()
    if (!config.configured) throw new AppError("integração fiscal não configurada", 409, "FISCAL_NOT_CONFIGURED")

    const tdb = getTenantDb(tenantSlug)
    const cnpjEmitente = await getTenantEmitenteCnpj(tenantSlug)
    const { items, payments } = await getSaleContext(tenantSlug, saleId)

    const existing = await getSaleFiscalDocument(tenantSlug, saleId)
    if (existing && isFinalStatus(existing.status as LocalFiscalStatus)) {
        throw new AppError("esta venda já possui NFC-e finalizada", 409, "FISCAL_ALREADY_PROCESSED")
    }

    const attemptCount = existing ? (existing.attemptCount ?? 1) + 1 : 1
    const ref = existing?.ref ?? buildSaleRef(saleId)

    if (existing && !canReemitStatus(existing.status as LocalFiscalStatus)) {
        throw new AppError("aguarde o processamento da NFC-e atual", 409, "FISCAL_PENDING_OPERATION")
    }

    const payload = buildNfcePayload({
        cnpjEmitente,
        items: items.map((item, index) =>
            mapSaleItemToNfceItem({
                index,
                productId: item.product?.id ?? item.productId,
                productName: item.product?.name ?? "PRODUTO",
                quantity: item.quantity,
                unitPriceCents: item.unitPrice,
                totalPriceCents: item.totalPrice,
                ncm: item.product?.fiscalNcm,
                cfop: item.product?.fiscalCfop,
                cst: item.product?.fiscalCst,
                origem: item.product?.fiscalOrigem,
                unidade: item.product?.fiscalUnidade,
            }),
        ),
        payments: payments.map((p) => ({
            formaPagamento: mapPaymentMethod(p.paymentMethod),
            valorPagamento: centsToReais(p.amount),
        })),
    })

    const response = await emitNfceRequest(ref, payload, options.fetchImpl)
    const status = normalizeStatus(response.status)

    const fields = {
        ...toDbFields(response, status),
        ref,
        lastRequest: JSON.stringify(payload).slice(0, 20000),
        attemptCount,
        environment: config.environment,
    }

    if (existing) {
        const [updated] = await tdb
            .update(fiscalDocument)
            .set({ ...fields, updatedByUserId: options.userId || undefined })
            .where(eq(fiscalDocument.id, existing.id))
            .returning()
        if (!updated) throw new AppError("documento fiscal não encontrado", 404, "FISCAL_NOT_FOUND")
        return updated
    }

    const [created] = await tdb
        .insert(fiscalDocument)
        .values({
            saleId,
            ...fields,
            createdByUserId: options.userId || undefined,
            updatedByUserId: options.userId || undefined,
        })
        .returning()
    if (!created) throw new AppError("falha ao registrar documento fiscal", 500, "FISCAL_PERSIST_FAILED")
    return created
}

export async function refreshSaleNfce(
    tenantSlug: string,
    saleId: string,
    options: { fetchImpl?: typeof fetch } = {},
): Promise<FiscalDocumentRow> {
    const existing = await getSaleFiscalDocument(tenantSlug, saleId)
    if (!existing) throw new AppError("nenhuma NFC-e encontrada para esta venda", 404, "FISCAL_NOT_FOUND")

    const response = await getNfceRequest(existing.ref, true, options.fetchImpl)
    const status = normalizeStatus(response.status)

    const tdb = getTenantDb(tenantSlug)
    const [updated] = await tdb
        .update(fiscalDocument)
        .set(toDbFields(response, status))
        .where(eq(fiscalDocument.id, existing.id))
        .returning()
    if (!updated) throw new AppError("documento fiscal não encontrado", 404, "FISCAL_NOT_FOUND")
    return updated
}

export async function cancelSaleNfce(
    tenantSlug: string,
    saleId: string,
    justificativa: string,
    options: { userId?: string; fetchImpl?: typeof fetch } = {},
): Promise<FiscalDocumentRow> {
    const existing = await getSaleFiscalDocument(tenantSlug, saleId)
    if (!existing) throw new AppError("nenhuma NFC-e encontrada para esta venda", 404, "FISCAL_NOT_FOUND")
    if (existing.status !== "autorizado") {
        throw new AppError("somente NFC-e autorizada pode ser cancelada", 409, "FISCAL_NOT_AUTHORIZED")
    }

    const response = await cancelNfceRequest(existing.ref, justificativa, options.fetchImpl)
    const status = normalizeStatus(response.status)
    const finalStatus: LocalFiscalStatus = status === "cancelado" ? "cancelado" : existing.status as LocalFiscalStatus

    const tdb = getTenantDb(tenantSlug)
    const [updated] = await tdb
        .update(fiscalDocument)
        .set({
            ...toDbFields(response, finalStatus),
            updatedByUserId: options.userId || undefined,
        })
        .where(eq(fiscalDocument.id, existing.id))
        .returning()
    if (!updated) throw new AppError("documento fiscal não encontrado", 404, "FISCAL_NOT_FOUND")
    return updated
}

export function isFiscalConfigured(): boolean {
    return getFocusConfig().configured
}
