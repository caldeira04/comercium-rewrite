import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { useCategories } from "@/hooks/use-categories"
import { useStockReport } from "@/hooks/use-stock"
import { periodOrCash, useReportFilters } from "@/hooks/use-report-filters"
import { useFormatDateTime, useTenantDates } from "@/hooks/use-tenant-timezone"
import { useTenantName } from "@/hooks/use-tenant-name"
import {
    CASH_PERIOD_HINT,
    CashFilterSelect,
    FilterSelect,
    ReportFilters,
    optionLabel,
    periodExportInfo,
    useSelectedCash,
} from "@/components/report-filters"
import { ExportMenu } from "@/components/export-menu"
import { STOCK_PRICE_NOTE, buildStockReportExport, formatAdjustment, matchesStockFilters, summarizeStock } from "@/lib/reports/stock"
import type { ReportExport } from "@/lib/export/types"
import type { StockReportProduct } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { formatDateInput } from "@/utils/time"

export const Route = createFileRoute("/products/report/")({
    component: RouteComponent,
})

const STOCK_OPTIONS = [
    { value: "all", label: "todos" },
    { value: "available", label: "com estoque" },
    { value: "empty", label: "sem estoque" },
]

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { categories } = useCategories()
    const tenantName = useTenantName()
    const formatDateTime = useFormatDateTime()
    const { filters, invalidRange: invalidPeriod, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        cashId: "all",
        categoryId: "all",
        stock: "all",
    })
    const hasCash = filters.cashId !== "all"
    const invalidRange = invalidPeriod && !hasCash
    const selectedCash = useSelectedCash(filters.cashId)
    const reportQuery = useStockReport(periodOrCash(filters), { enabled: !invalidRange })
    const report = invalidRange ? undefined : reportQuery.data

    const categoryOptions = [
        { value: "all", label: "todas as categorias" },
        { value: "none", label: "sem categoria" },
        ...(categories ?? []).map((category) => ({
            value: String(category.id),
            label: category.name ?? "sem nome",
        })),
    ]

    const products = report?.products.filter((product) => matchesStockFilters(product, filters))
    const { moved, zeroStock, negativeMargin, stockValue, saleValue, unitsIn, unitsOut } = summarizeStock(products ?? [])

    const positionLabel = hasCash
        ? "posição no fechamento do caixa (ou agora, se ainda aberto)"
        : `posição em ${formatDateInput(filters.endDate)}`

    function buildExport(): ReportExport | null {
        if (!products || products.length === 0) return null

        const period = periodExportInfo(filters, selectedCash)

        return buildStockReportExport(products, {
            tenantName,
            formatDateTime,
            fileSuffix: period.fileSuffix,
            filters: [
                period.filter,
                { label: "Categoria", value: optionLabel(categoryOptions, filters.categoryId) },
                { label: "Estoque", value: optionLabel(STOCK_OPTIONS, filters.stock) },
            ],
        })
    }

    return (
        <div className="flex w-full flex-col gap-4 self-start p-3 md:min-h-screen md:p-4">
            <div>
                <h1 className="text-xl font-bold uppercase md:text-2xl">relatório de estoque</h1>
                <p className="text-muted-foreground">movimentação no período, valorização e alertas ({positionLabel})</p>
            </div>
            <ReportFilters
                startDate={filters.startDate}
                endDate={filters.endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                periodDisabledHint={hasCash ? CASH_PERIOD_HINT : undefined}
                onReset={reset}
                actions={<ExportMenu build={buildExport} disabled={!products || products.length === 0} />}
            >
                <CashFilterSelect value={filters.cashId} onChange={(value) => setFilter("cashId", value)} />
                <FilterSelect
                    label="categoria"
                    className="sm:w-56"
                    value={filters.categoryId}
                    onChange={(value) => setFilter("categoryId", value)}
                    options={categoryOptions}
                />
                <FilterSelect
                    label="estoque"
                    value={filters.stock}
                    onChange={(value) => setFilter("stock", value)}
                    options={STOCK_OPTIONS}
                />
            </ReportFilters>
            {!invalidRange && reportQuery.isPending && <Spinner />}
            {!invalidRange && reportQuery.isError && <span>ocorreu um erro ao buscar o estoque</span>}
            {products && (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
                        <Metric label="produtos" value={String(products.length)} />
                        <Metric label="entradas (un.)" value={String(unitsIn)} />
                        <Metric label="saídas (un.)" value={String(unitsOut)} />
                        <Metric label="custo em estoque" value={formatCurrency(stockValue)} />
                        <Metric label="valor de venda" value={formatCurrency(saleValue)} />
                        <Metric label="lucro potencial" value={formatCurrency(saleValue - stockValue)} />
                    </div>
                    <Card>
                        <CardContent className="flex flex-col">
                            <h2 className="mb-4 font-bold">movimentação no período</h2>
                            <MovementTable products={moved} />
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <CardContent className="flex flex-col">
                                <h2 className="mb-4 font-bold">produtos sem estoque</h2>
                                <ProductSummaryTable products={zeroStock} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex flex-col">
                                <h2 className="mb-4 font-bold">margem negativa</h2>
                                <ProductSummaryTable products={negativeMargin} />
                            </CardContent>
                        </Card>
                    </div>
                    <p className="text-xs text-muted-foreground">{STOCK_PRICE_NOTE}</p>
                </>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </CardContent>
        </Card>
    )
}

function MovementTable({ products }: { products: StockReportProduct[] }) {
    if (products.length === 0) return <p className="text-muted-foreground">nenhuma movimentação no período</p>

    return (
        <div className="max-h-[420px] overflow-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>produto</TableHead>
                        <TableHead className="text-right">inicial</TableHead>
                        <TableHead className="text-right">entradas</TableHead>
                        <TableHead className="text-right">saídas</TableHead>
                        <TableHead className="text-right">ajustes</TableHead>
                        <TableHead className="text-right">final</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{product.opening}</TableCell>
                            <TableCell className="text-right tabular-nums text-[var(--success)]">{product.inflow > 0 ? `+${product.inflow}` : "-"}</TableCell>
                            <TableCell className="text-right tabular-nums text-[var(--danger)]">{product.outflow > 0 ? `−${product.outflow}` : "-"}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAdjustment(product)}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">{product.closing}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function ProductSummaryTable({ products }: { products: StockReportProduct[] }) {
    if (products.length === 0) return <p className="text-muted-foreground">nenhum item encontrado</p>

    return (
        <div className="max-h-[360px] overflow-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>produto</TableHead>
                        <TableHead className="text-right">estoque</TableHead>
                        <TableHead className="text-right">margem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right">{product.closing}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.sellPrice - product.buyPrice)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
