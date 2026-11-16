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
import { useProducts } from "@/hooks/use-products"
import { useCategories } from "@/hooks/use-categories"
import { useReportFilters } from "@/hooks/use-report-filters"
import { FilterSelect, ReportFilters } from "@/components/report-filters"
import type { Product } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"

export const Route = createFileRoute("/products/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { products: allProducts, productsIsPending, productsIsError } = useProducts()
    const { categories } = useCategories()
    const { filters, setFilter, reset } = useReportFilters({ categoryId: "all", stock: "all" })
    const products = allProducts?.filter((product) => matchesFilters(product, filters))
    const totalProducts = products?.length ?? 0
    const stockValue = products?.reduce((total, product) => total + getProductStock(product) * product.buyPrice, 0) ?? 0
    const saleValue = products?.reduce((total, product) => total + getProductStock(product) * product.sellPrice, 0) ?? 0
    const zeroStock = products?.filter((product) => getProductStock(product) <= 0) ?? []
    const negativeMargin = products?.filter((product) => product.sellPrice < product.buyPrice) ?? []

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start overflow-hidden p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">relatório de estoque</h1>
                <p className="text-muted-foreground">valorização, alertas e margem dos produtos cadastrados (posição atual)</p>
            </div>
            <ReportFilters onReset={reset}>
                <FilterSelect
                    label="categoria"
                    className="w-56"
                    value={filters.categoryId}
                    onChange={(value) => setFilter("categoryId", value)}
                    options={[
                        { value: "all", label: "todas as categorias" },
                        { value: "none", label: "sem categoria" },
                        ...(categories ?? []).map((category) => ({
                            value: String(category.id),
                            label: category.name ?? "sem nome",
                        })),
                    ]}
                />
                <FilterSelect
                    label="estoque"
                    value={filters.stock}
                    onChange={(value) => setFilter("stock", value)}
                    options={[
                        { value: "all", label: "todos" },
                        { value: "available", label: "com estoque" },
                        { value: "empty", label: "sem estoque" },
                    ]}
                />
            </ReportFilters>
            {productsIsPending && <Spinner />}
            {productsIsError && <span>ocorreu um erro ao buscar os produtos</span>}
            {products && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <Metric label="produtos" value={String(totalProducts)} />
                        <Metric label="custo em estoque" value={formatCurrency(stockValue)} />
                        <Metric label="valor de venda" value={formatCurrency(saleValue)} />
                        <Metric label="lucro potencial" value={formatCurrency(saleValue - stockValue)} />
                    </div>
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
                        <Card className="min-h-0">
                            <CardContent className="flex h-full min-h-0 flex-col">
                                <h2 className="mb-4 font-bold">produtos sem estoque</h2>
                                <ProductSummaryTable products={zeroStock} />
                            </CardContent>
                        </Card>
                        <Card className="min-h-0">
                            <CardContent className="flex h-full min-h-0 flex-col">
                                <h2 className="mb-4 font-bold">margem negativa</h2>
                                <ProductSummaryTable products={negativeMargin} />
                            </CardContent>
                        </Card>
                    </div>
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

function ProductSummaryTable({ products }: { products: Product[] }) {
    if (products.length === 0) return <p className="text-muted-foreground">nenhum item encontrado</p>

    return (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
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
                            <TableCell className="text-right">{getProductStock(product)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.sellPrice - product.buyPrice)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function matchesFilters(product: Product, filters: { categoryId: string, stock: string }) {
    if (filters.categoryId === "none" && product.category) return false
    if (filters.categoryId !== "all" && filters.categoryId !== "none"
        && String(product.category?.id) !== filters.categoryId) return false

    const stock = getProductStock(product)
    if (filters.stock === "available" && stock <= 0) return false
    if (filters.stock === "empty" && stock > 0) return false

    return true
}

function getProductStock(product: Product) {
    return product.stockMovement.reduce((total, movement) => {
        if (movement.type === "in") return total + movement.quantity
        if (movement.type === "out") return total - movement.quantity
        if (movement.type === "adjustment") return movement.quantity
        return total
    }, 0)
}
