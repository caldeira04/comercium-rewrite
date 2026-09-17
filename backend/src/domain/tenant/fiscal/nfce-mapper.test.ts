import { describe, expect, test } from "bun:test"
import {
    buildNfcePayload,
    buildSaleRef,
    canReemitStatus,
    centsToReais,
    isFinalStatus,
    mapFocusStatus,
    mapPaymentMethod,
    mapSaleItemToNfceItem,
    sanitizeRef,
} from "./nfce-mapper"

describe("sanitizeRef", () => {
    test("remove caracteres proibidos", () => {
        expect(sanitizeRef("venda 123@x/y")).toBe("venda123xy")
    })

    test("remove acentos", () => {
        expect(sanitizeRef("notá-físcal 01")).toBe("notafiscal01")
    })

    test("rejeita ref vazia", () => {
        expect(() => sanitizeRef("@@@ ///")).toThrow()
    })
})

describe("buildSaleRef", () => {
    test("gera ref estável a partir do saleId", () => {
        const ref = buildSaleRef("123e4567-e89b-12d3-a456-426614174000")
        expect(ref).toMatch(/^[A-Za-z0-9]+$/)
        expect(ref.length).toBeLessThanOrEqual(60)
    })

    test("tentativa adiciona sufixo", () => {
        const first = buildSaleRef("abc-123")
        const second = buildSaleRef("abc-123", 2)
        expect(second).not.toBe(first)
        expect(second).toContain("r2")
    })
})

describe("mapPaymentMethod", () => {
    test("mapeia métodos internos para códigos SEFAZ", () => {
        expect(mapPaymentMethod("cash")).toBe("01")
        expect(mapPaymentMethod("credit")).toBe("03")
        expect(mapPaymentMethod("debit")).toBe("04")
        expect(mapPaymentMethod("pix")).toBe("17")
        expect(mapPaymentMethod("voucher")).toBe("99")
    })

    test("método desconhecido vira outros", () => {
        expect(mapPaymentMethod("boleto")).toBe("99")
    })
})

describe("centsToReais", () => {
    test("converte centavos para reais", () => {
        expect(centsToReais(7900)).toBe(79)
        expect(centsToReais(1)).toBe(0.01)
    })
})

describe("mapSaleItemToNfceItem", () => {
    test("usa defaults fiscais quando produto não tem dados", () => {
        const item = mapSaleItemToNfceItem({
            index: 0,
            productId: 42,
            productName: "CAMISETA",
            quantity: 2,
            unitPriceCents: 3950,
            totalPriceCents: 7900,
        })
        expect(item.codigoNcm).toBe("00000000")
        expect(item.cfop).toBe("5102")
        expect(item.icmsSituacaoTributaria).toBe("102")
        expect(item.valorUnitarioComercial).toBe(39.5)
        expect(item.valorBruto).toBe(79)
    })
})

describe("buildNfcePayload", () => {
    test("monta payload mínimo válido", () => {
        const payload = buildNfcePayload({
            cnpjEmitente: "12.345.678/0001-23",
            items: [
                mapSaleItemToNfceItem({
                    index: 0,
                    productId: 1,
                    productName: "PRODUTO EXEMPLO",
                    quantity: 1,
                    unitPriceCents: 7900,
                    totalPriceCents: 7900,
                }),
            ],
            payments: [{ formaPagamento: "03", valorPagamento: 79 }],
        })
        expect(payload.cnpjEmitente).toBe("12345678000123")
        expect(payload.naturezaOperacao).toBe("VENDA AO CONSUMIDOR")
        expect(payload.items).toHaveLength(1)
        expect(payload.formas_pagamento).toHaveLength(1)
    })

    test("rejeita CNPJ inválido", () => {
        expect(() =>
            buildNfcePayload({
                cnpjEmitente: "123",
                items: [
                    mapSaleItemToNfceItem({
                        index: 0,
                        productId: 1,
                        productName: "X",
                        quantity: 1,
                        unitPriceCents: 100,
                        totalPriceCents: 100,
                    }),
                ],
                payments: [{ formaPagamento: "01", valorPagamento: 1 }],
            }),
        ).toThrow()
    })
})

describe("mapFocusStatus", () => {
    test("mapeia status da Focus para status local", () => {
        expect(mapFocusStatus("autorizado")).toBe("autorizado")
        expect(mapFocusStatus("cancelado")).toBe("cancelado")
        expect(mapFocusStatus("erro_autorizacao")).toBe("erro_autorizacao")
        expect(mapFocusStatus("denegado")).toBe("denegado")
        expect(mapFocusStatus("processando_autorizacao")).toBe("processando")
        expect(mapFocusStatus("qualquer_outro")).toBe("pendente")
    })

    test("regras de reemissão e finalização", () => {
        expect(canReemitStatus("erro_autorizacao")).toBe(true)
        expect(canReemitStatus("autorizado")).toBe(false)
        expect(isFinalStatus("autorizado")).toBe(true)
        expect(isFinalStatus("cancelado")).toBe(true)
        expect(isFinalStatus("denegado")).toBe(true)
        expect(isFinalStatus("pendente")).toBe(false)
    })
})
