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

        INSERT INTO sale (id, total_amount, client_id, created_at) VALUES
            ('s1', 1000, 1, '2026-11-16 15:00:00'),
            ('s2', 2000, NULL, '2026-11-17 00:30:00'),
            ('s3', 3000, 1, '2026-11-17 03:30:00');

        INSERT INTO payment (id, sale_id, amount, payment_method, status, paid_at) VALUES
            ('p1', 's1', 1000, 'pix', 'paid', '2026-11-16 15:00:00'),
            ('p2', 's2', 2000, 'cash', 'paid', '2026-11-17 00:30:00'),
            ('p3', 's3', 3000, 'pix', 'paid', '2026-11-17 03:30:00');
    `)
    sqlite.close()

    sales = await import("./sales/SalesService")
    cashes = await import("./cash/CashService")
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

    test("filtra por situação", async () => {
        expect(await cashIds({ status: "closed" })).toEqual(["c1"])
        expect(await cashIds({ status: "open", startDate: "2026-11-16", endDate: "2026-11-16" })).toEqual(["c2"])
    })
})
