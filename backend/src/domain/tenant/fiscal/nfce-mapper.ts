import { AppError } from "../../../utils/errors"
import type { NfcePagamentoInput, NfcePayload, NfceItemInput, FocusNfceStatus, LocalFiscalStatus } from "./nfce-types"

export const DEFAULT_CFOP = "5102"
export const DEFAULT_NCM = "00000000"
export const DEFAULT_CST = "102"
export const DEFAULT_ORIGEM = "0"
export const DEFAULT_UNIDADE = "un"

export function sanitizeRef(raw: string): string {
    const normalized = raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 60)

    if (!normalized) {
        throw new AppError("referência fiscal inválida", 400, "INVALID_FISCAL_REF")
    }

    return normalized
}

export function buildSaleRef(saleId: string, attempt = 0): string {
    const base = `sale${saleId.replace(/[^A-Za-z0-9]/g, "").slice(0, 40)}`
    const suffix = attempt > 0 ? `r${attempt}` : ""
    return sanitizeRef(`${base}${suffix}`.slice(0, 60))
}

export function mapPaymentMethod(method: string): string {
    switch (method) {
        case "cash":
            return "01"
        case "credit":
            return "03"
        case "debit":
            return "04"
        case "pix":
            return "17"
        case "voucher":
            return "99"
        default:
            return "99"
    }
}

export function centsToReais(cents: number): number {
    return Math.round(cents) / 100
}

export function onlyDigits(value: string): string {
    return value.replace(/\D/g, "")
}

export function mapSaleItemToNfceItem(args: {
    index: number
    productId: number | string
    productName: string
    quantity: number
    unitPriceCents: number
    totalPriceCents: number
    ncm?: string | null
    cfop?: string | null
    cst?: string | null
    origem?: string | null
    unidade?: string | null
}): NfceItemInput {
    const valorUnitario = centsToReais(args.unitPriceCents)
    const valorBruto = centsToReais(args.totalPriceCents)

    return {
        numeroItem: args.index + 1,
        codigoNcm: (args.ncm ?? DEFAULT_NCM).replace(/\D/g, "") || DEFAULT_NCM,
        codigoProduto: String(args.productId),
        descricao: args.productName.slice(0, 120) || "PRODUTO",
        quantidadeComercial: args.quantity,
        quantidadeTributavel: args.quantity,
        cfop: (args.cfop ?? DEFAULT_CFOP).replace(/\D/g, "") || DEFAULT_CFOP,
        valorUnitarioComercial: valorUnitario,
        valorUnitarioTributavel: valorUnitario,
        valorBruto,
        unidadeComercial: (args.unidade ?? DEFAULT_UNIDADE).slice(0, 6) || DEFAULT_UNIDADE,
        unidadeTributavel: (args.unidade ?? DEFAULT_UNIDADE).slice(0, 6) || DEFAULT_UNIDADE,
        icmsOrigem: args.origem ?? DEFAULT_ORIGEM,
        icmsSituacaoTributaria: args.cst ?? DEFAULT_CST,
    }
}

export function buildNfcePayload(args: {
    cnpjEmitente: string
    items: NfceItemInput[]
    payments: NfcePagamentoInput[]
    dataEmissao?: string
    informacoesAdicionais?: string
}): NfcePayload {
    const cnpj = onlyDigits(args.cnpjEmitente)

    if (cnpj.length !== 14) {
        throw new AppError("CNPJ do emitente inválido para NFC-e", 400, "INVALID_EMITENTE_CNPJ")
    }
    if (args.items.length === 0) {
        throw new AppError("venda sem itens não pode gerar NFC-e", 400, "SALE_WITHOUT_ITEMS")
    }
    if (args.payments.length === 0) {
        throw new AppError("venda sem pagamento não pode gerar NFC-e", 400, "SALE_WITHOUT_PAYMENTS")
    }

    return {
        cnpjEmitente: cnpj,
        dataEmissao: args.dataEmissao ?? new Date().toISOString(),
        presencaComprador: "1",
        modalidadeFrete: "9",
        localDestino: "1",
        naturezaOperacao: "VENDA AO CONSUMIDOR",
        items: args.items.map((item) => ({
            numero_item: String(item.numeroItem),
            codigo_ncm: item.codigoNcm,
            codigo_produto: item.codigoProduto,
            descricao: item.descricao,
            quantidade_comercial: item.quantidadeComercial,
            quantidade_tributavel: item.quantidadeTributavel,
            cfop: item.cfop,
            valor_unitario_comercial: item.valorUnitarioComercial,
            valor_unitario_tributavel: item.valorUnitarioTributavel,
            valor_bruto: item.valorBruto,
            unidade_comercial: item.unidadeComercial,
            unidade_tributavel: item.unidadeTributavel,
            icms_origem: item.icmsOrigem,
            icms_situacao_tributaria: item.icmsSituacaoTributaria,
        })),
        formas_pagamento: args.payments.map((payment) => ({
            forma_pagamento: payment.formaPagamento,
            valor_pagamento: payment.valorPagamento,
        })),
        ...(args.informacoesAdicionais ? { informacoes_adicionais_contribuinte: args.informacoesAdicionais } : {}),
    }
}

export function mapFocusStatus(status?: string): LocalFiscalStatus {
    switch ((status ?? "").toLowerCase() as FocusNfceStatus) {
        case "autorizado":
            return "autorizado"
        case "cancelado":
            return "cancelado"
        case "erro_autorizacao":
            return "erro_autorizacao"
        case "denegado":
            return "denegado"
        case "processando_autorizacao":
            return "processando"
        default:
            return "pendente"
    }
}

export function canReemitStatus(status: LocalFiscalStatus): boolean {
    return status === "erro_autorizacao" || status === "pendente" || status === "processando"
}

export function isFinalStatus(status: LocalFiscalStatus): boolean {
    return status === "autorizado" || status === "denegado" || status === "cancelado"
}
