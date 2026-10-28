import { XMLParser } from "fast-xml-parser"
import { AppError } from "../../utils/errors"

export type NfeItem = {
    code: string
    ean: string | null
    description: string
    unit: string
    quantity: number
    // Centavos
    unitPrice: number
    total: number
}

export type NfeInstallment = {
    number: string
    dueDate: string
    amount: number
}

export type ParsedNfe = {
    accessKey: string
    number: string
    issuedAt: string
    supplier: { document: string | null, name: string }
    items: NfeItem[]
    total: number
    installments: NfeInstallment[]
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    // Mantém tudo como texto: EAN e CNPJ perderiam zeros à esquerda como número
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => name === "det" || name === "dup",
})

function text(value: unknown) {
    if (value === undefined || value === null) return ""
    if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
        return String((value as Record<string, unknown>)["#text"]).trim()
    }
    return String(value).trim()
}

function decimal(value: unknown) {
    const parsed = Number(text(value))
    return Number.isFinite(parsed) ? parsed : 0
}

function cents(value: unknown) {
    return Math.round(decimal(value) * 100)
}

function digits(value: unknown) {
    const only = text(value).replace(/\D/g, "")
    return only || null
}

// Lê uma NF-e (modelo 55) sem IA: emitente, itens, total e duplicatas
export function parseNfe(xml: string): ParsedNfe {
    let document: Record<string, any>
    try {
        document = parser.parse(xml)
    } catch {
        throw new AppError("não consegui ler o XML", 400, "INVALID_NFE")
    }

    const nfe = document.nfeProc?.NFe ?? document.NFe
    const info = nfe?.infNFe
    if (!info) throw new AppError("o arquivo não parece uma NF-e", 400, "INVALID_NFE")

    const accessKey = digits(document.nfeProc?.protNFe?.infProt?.chNFe) ?? digits(info["@_Id"])
    if (!accessKey || accessKey.length !== 44) {
        throw new AppError("a NF-e não tem uma chave de acesso válida", 400, "INVALID_NFE")
    }

    const items: NfeItem[] = (info.det ?? []).map((detail: Record<string, any>) => {
        const product = detail.prod ?? {}
        return {
            code: text(product.cProd),
            // "SEM GTIN" vira null
            ean: digits(product.cEAN),
            description: text(product.xProd),
            unit: text(product.uCom).toUpperCase(),
            quantity: decimal(product.qCom),
            unitPrice: cents(product.vUnCom),
            total: cents(product.vProd) - cents(product.vDesc),
        }
    })

    if (items.length === 0) throw new AppError("a NF-e não tem itens", 400, "INVALID_NFE")

    const issued = text(info.ide?.dhEmi) || text(info.ide?.dEmi)

    return {
        accessKey,
        number: text(info.ide?.nNF),
        issuedAt: issued.slice(0, 10),
        supplier: {
            document: digits(info.emit?.CNPJ) ?? digits(info.emit?.CPF),
            name: text(info.emit?.xFant) || text(info.emit?.xNome),
        },
        items,
        total: cents(info.total?.ICMSTot?.vNF),
        installments: (info.cobr?.dup ?? []).map((installment: Record<string, any>) => ({
            number: text(installment.nDup),
            dueDate: text(installment.dVenc),
            amount: cents(installment.vDup),
        })),
    }
}
