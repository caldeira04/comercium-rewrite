import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

// O banco é resolvido na importação de "@/db/db", então o diretório de dados
// temporário precisa existir antes de importar os módulos testados
const dataDir = mkdtempSync(path.join(tmpdir(), "comercium-report-filters-"))
process.env.COMERCIUM_DATA_DIR = dataDir

const TENANT = "report_filters_test"
const TIME_ZONE = "America/Sao_Paulo"

let sales: typeof import("./sales/SalesService")
let cashes: typeof import("./cash/CashService")
let receivables: typeof import("./receivables/ReceivablesService")
let stock: typeof import("./stock/StockService")

beforeAll(async () => {
    mkdirSync(path.join(dataDir, "tenants"), { recursive: true })
    const sqlite = new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`), { create: true })
    migrate(drizzle(sqlite), { migrationsFolder: path.resolve(import.meta.dir, "../../../drizzle/migrations/tenant") })

    // Horários em UTC; 2026-11-17 00:30 UTC ainda é 16/11 21:30 em São Paulo
    sqlite.exec(`
        INSERT INTO client (id, name) VALUES (1, 'Maria Souza');

        INSERT INTO cash (id, opening_amount, created_at, closed_at) VALUES
            ('c1', 1000, '2026-11-16 12:00:00', '2026-11-17 01:00:00'),
            ('c2', 1000, '2026-11-17 02:30:00', NULL),
            ('c3', 1000, '2026-11-17 12:00:00', NULL);

        -- s2 ficou pendente (sem cash_id), mas recebeu um pagamento no caixa c1
        INSERT INTO sale (id, total_amount, client_id, cash_id, created_at) VALUES
            ('s1', 1000, 1, 'c1', '2026-11-16 15:00:00'),
            ('s2', 2000, NULL, NULL, '2026-11-17 00:30:00'),
            ('s3', 3000, 1, 'c2', '2026-11-17 03:30:00');

        INSERT INTO payment (id, sale_id, amount, payment_method, status, paid_at) VALUES
            ('p1', 's1', 1000, 'pix', 'paid', '2026-11-16 15:00:00'),
            ('p2', 's2', 2000, 'cash', 'paid', '2026-11-17 00:30:00'),
            ('p3', 's3', 3000, 'pix', 'refunded', '2026-11-17 03:30:00');

        INSERT INTO product (id, name, sell_price, buy_price) VALUES
            (10, 'Coca 350ml', 600, 300),
            (11, 'Pão', 100, 50);

        INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price) VALUES
            ('i1', 's1', 10, 1, 600, 600),
            ('i2', 's1', 11, 3, 100, 300),
            ('i3', 's1', 11, 1, 100, 100);

        INSERT INTO cash_movement (id, cash_id, nature, type, amount, description, reference_type, reference_id, created_at) VALUES
            ('m0', 'c1', 'in', 'open', 1000, NULL, NULL, NULL, '2026-11-16 12:00:00'),
            ('m1', 'c1', 'in', 'payment', 1000, 'venda realizada', 'payment', 'p1', '2026-11-16 15:00:00'),
            ('m2', 'c1', 'in', 'payment', 2000, 'venda realizada', 'payment', 'p2', '2026-11-17 00:30:00'),
            ('m3', 'c1', 'out', 'drop', 500, 'troco para o cofre', 'manual', NULL, '2026-11-17 00:40:00'),
            ('m4', 'c2', 'in', 'payment', 3000, 'venda realizada', 'payment', 'p3', '2026-11-17 03:30:00'),
            ('m5', 'c2', 'out', 'refund', 3000, 'estorno de pagamento', 'refund', 'p3', '2026-11-17 04:00:00');

        -- Estoque: o ajuste define o saldo absoluto; movimentos excluídos não contam
        INSERT INTO stock_movement (id, product_id, type, quantity, created_at, deleted_at) VALUES
            ('e1', 10, 'in', 10, '2026-11-10 12:00:00', NULL),
            ('e2', 10, 'out', 2, '2026-11-16 13:00:00', NULL),
            ('e3', 10, 'adjustment', 5, '2026-11-16 14:00:00', NULL),
            ('e4', 10, 'out', 1, '2026-11-16 15:00:00', NULL),
            ('e5', 10, 'in', 4, '2026-11-18 12:00:00', NULL),
            ('e6', 11, 'in', 7, '2026-11-16 13:00:00', '2026-11-16 13:05:00');
    `)
    sqlite.close()

    sales = await import("./sales/SalesService")
    cashes = await import("./cash/CashService")
    receivables = await import("./receivables/ReceivablesService")
    stock = await import("./stock/StockService")
})

afterAll(() => {
    rmSync(dataDir, { recursive: true, force: true })
})

async function saleIds(filters: Parameters<typeof sales.getSales>[1]) {
    return (await sales.getSales(TENANT, { timeZone: TIME_ZONE, ...filters })).map((sale) => sale.id).sort()
}

async function cashIds(filters: Parameters<typeof cashes.getCashes>[1]) {
    return (await cashes.getCashes(TENANT, { timeZone: TIME_ZONE, ...filters })).map((cash) => cash.id).sort()
}

describe("getSales filters", () => {
    test("sem filtros devolve todas as vendas", async () => {
        expect(await saleIds({})).toEqual(["s1", "s2", "s3"])
    })

    test("o período usa o dia local do tenant, não o dia UTC", async () => {
        expect(await saleIds({ startDate: "2026-11-16", endDate: "2026-11-16" })).toEqual(["s1", "s2"])
        expect(await saleIds({ startDate: "2026-11-17", endDate: "2026-11-17" })).toEqual(["s3"])
    })

    test("o fuso informado muda o dia em que a venda cai", async () => {
        expect(await saleIds({ startDate: "2026-11-17", endDate: "2026-11-17", timeZone: "UTC" })).toEqual(["s2", "s3"])
    })

    test("filtra por cliente e por forma de pagamento", async () => {
        expect(await saleIds({ clientId: 1 })).toEqual(["s1", "s3"])
        expect(await saleIds({ clientId: "none" })).toEqual(["s2"])
        expect(await saleIds({ paymentMethod: "pix" })).toEqual(["s1", "s3"])
        expect(await saleIds({ paymentMethod: "pix", startDate: "2026-11-17", endDate: "2026-11-17" })).toEqual(["s3"])
    })

    test("rejeita período inválido", async () => {
        await expect(saleIds({ startDate: "2026-11-17", endDate: "2026-11-16" })).rejects.toThrow()
        await expect(saleIds({ startDate: "2026-11-17" })).rejects.toThrow()
        await expect(saleIds({ startDate: "17/11/2026", endDate: "2026-11-17" })).rejects.toThrow()
    })
})

describe("getCashes filters", () => {
    test("o período considera a abertura no dia local do tenant", async () => {
        expect(await cashIds({})).toEqual(["c1", "c2", "c3"])
        expect(await cashIds({ startDate: "2026-11-16", endDate: "2026-11-16" })).toEqual(["c1", "c2"])
        expect(await cashIds({ startDate: "2026-11-17", endDate: "2026-11-17" })).toEqual(["c3"])
    })

    test("periodMatch active inclui caixas que estavam abertos no período", async () => {
        // c1 fechou em 16/11 22:00 local; c2 abriu em 16/11 23:30 e segue aberto
        expect(await cashIds({ startDate: "2026-11-17", endDate: "2026-11-17", periodMatch: "active" })).toEqual(["c2", "c3"])
        expect(await cashIds({ startDate: "2026-11-16", endDate: "2026-11-16", periodMatch: "active" })).toEqual(["c1", "c2"])
    })

    test("filtra por situação", async () => {
        expect(await cashIds({ status: "closed" })).toEqual(["c1"])
        expect(await cashIds({ status: "open", startDate: "2026-11-16", endDate: "2026-11-16" })).toEqual(["c2"])
    })
})

describe("número sequencial", () => {
    test("registros sem número recebem o próximo pelo trigger", async () => {
        const list = await sales.getSales(TENANT, { timeZone: TIME_ZONE })
        expect(list.map((sale) => [sale.id, sale.number]).sort()).toEqual([["s1", 1], ["s2", 2], ["s3", 3]])
    })

    test("createSale e createCash devolvem o número atribuído", async () => {
        const sale = await sales.createSale(TENANT, { userId: "u1" })
        expect(sale.number).toBe(4)

        const cash = await cashes.createCash(TENANT, { openingAmount: 0, userId: "u1" })
        expect(cash.number).toBe(4)
    })
})

describe("filtro por caixa", () => {
    test("vendas finalizadas no caixa ou com pagamento lançado nele", async () => {
        expect(await saleIds({ cashId: "c1" })).toEqual(["s1", "s2"])
        expect(await saleIds({ cashId: "c2" })).toEqual(["s3"])
        expect(await saleIds({ cashId: "c3" })).toEqual([])
    })

    test("o caixa substitui o período", async () => {
        expect(await saleIds({ cashId: "c1", startDate: "2026-01-01", endDate: "2026-01-01" })).toEqual(["s1", "s2"])
    })

    test("caixas e recebimentos", async () => {
        expect(await cashIds({ cashId: "c2" })).toEqual(["c2"])

        const received = await receivables.getReceivables(TENANT, { cashId: "c1", status: "all", timeZone: TIME_ZONE })
        expect(received.rows.map((row) => row.id).sort()).toEqual(["p1", "p2"])
        expect(received.rows.find((row) => row.id === "p1")?.sale.number).toBe(1)

        await expect(receivables.getReceivables(TENANT, { status: "all", timeZone: TIME_ZONE })).rejects.toThrow()
    })
})

describe("extrato do caixa", () => {
    test("lista entradas e saídas em ordem, com saldo e contexto da venda", async () => {
        const statement = await cashes.getCashMovements(TENANT, "c1")

        expect(statement.cash.number).toBe(1)
        expect(statement.movements.map((movement) => [movement.type, movement.balance])).toEqual([
            ["open", 1000],
            ["payment", 2000],
            ["payment", 4000],
            ["drop", 3500],
        ])

        const firstPayment = statement.movements[1]
        expect(firstPayment.paymentMethod).toBe("pix")
        expect(firstPayment.sale?.number).toBe(1)
        expect(firstPayment.sale?.client?.name).toBe("Maria Souza")
        expect(firstPayment.sale?.items).toEqual([
            { name: "Coca 350ml", quantity: 1, totalPrice: 600 },
            { name: "Pão", quantity: 4, totalPrice: 400 },
        ])
        expect(statement.movements[3].description).toBe("troco para o cofre")
        expect(statement.totals).toMatchObject({ inflow: 4000, outflow: 500, balance: 3500 })
    })

    test("estorno aponta para a venda do pagamento", async () => {
        const statement = await cashes.getCashMovements(TENANT, "c2")
        const refund = statement.movements.find((movement) => movement.type === "refund")

        expect(refund?.sale?.number).toBe(3)
        expect(refund?.paymentMethod).toBe("pix")
    })

    test("caixa inexistente", async () => {
        await expect(cashes.getCashMovements(TENANT, "nope")).rejects.toThrow()
    })
})

describe("relatório de estoque", () => {
    test("saldo inicial, movimentos e saldo final do período", async () => {
        const report = await stock.getStockReport(TENANT, { startDate: "2026-11-16", endDate: "2026-11-16", timeZone: TIME_ZONE })
        const coca = report.products.find((product) => product.id === 10)
        const pao = report.products.find((product) => product.id === 11)

        expect(coca).toMatchObject({ opening: 10, inflow: 0, outflow: 3, adjustments: 1, adjustmentDelta: -3, closing: 4 })
        expect(pao).toMatchObject({ opening: 0, inflow: 0, outflow: 0, closing: 0 })
    })

    test("período posterior parte do saldo acumulado", async () => {
        const report = await stock.getStockReport(TENANT, { startDate: "2026-11-18", endDate: "2026-11-18", timeZone: TIME_ZONE })

        expect(report.products.find((product) => product.id === 10)).toMatchObject({ opening: 4, inflow: 4, closing: 8 })
    })

    test("janela do caixa vai da abertura ao fechamento", async () => {
        // c1: 16/11 12:00 a 17/11 01:00 UTC
        const report = await stock.getStockReport(TENANT, { cashId: "c1", timeZone: TIME_ZONE })

        expect(report.cash?.number).toBe(1)
        expect(report.products.find((product) => product.id === 10)).toMatchObject({ opening: 10, outflow: 3, closing: 4 })
    })

    test("exige período ou caixa", async () => {
        await expect(stock.getStockReport(TENANT, { timeZone: TIME_ZONE })).rejects.toThrow()
    })
})
