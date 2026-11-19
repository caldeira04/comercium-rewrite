import { describe, expect, it } from "vitest"
import { buildCsv, csvMoney, escapeCsvCell } from "./csv"

describe("escapeCsvCell", () => {
    it("deixa textos simples como estão", () => {
        expect(escapeCsvCell("Maria Souza")).toBe("Maria Souza")
        expect(escapeCsvCell(null)).toBe("")
        expect(escapeCsvCell(undefined)).toBe("")
    })

    it("usa vírgula decimal em números", () => {
        expect(escapeCsvCell(3)).toBe("3")
        expect(escapeCsvCell(1.5)).toBe("1,5")
    })

    it("coloca entre aspas textos com separador, aspas ou quebra de linha", () => {
        expect(escapeCsvCell("a;b")).toBe("\"a;b\"")
        expect(escapeCsvCell("pão \"francês\"")).toBe("\"pão \"\"francês\"\"\"")
        expect(escapeCsvCell("2× Coca\n1× Pão")).toBe("\"2× Coca\n1× Pão\"")
    })

    it("neutraliza textos que seriam lidos como fórmula", () => {
        expect(escapeCsvCell("=SOMA(A1)")).toBe("'=SOMA(A1)")
        expect(escapeCsvCell("-12,50")).toBe("-12,50")
    })
})

describe("buildCsv", () => {
    it("monta cabeçalho e linhas com ; e CRLF", () => {
        expect(buildCsv(["nº", "total"], [[1, csvMoney(1250)], [2, csvMoney(-300)]]))
            .toBe("nº;total\r\n1;12,50\r\n2;-3,00")
    })

    it("mantém a célula de várias linhas na mesma linha da tabela", () => {
        const csv = buildCsv(["produtos"], [["1× A\n2× B"]])

        expect(csv).toBe("produtos\r\n\"1× A\n2× B\"")
    })
})
