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
import type { Product } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"

export const Route = createFileRoute("/products/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { products, productsIsPending, productsIsError } = useProducts()
    const totalProducts = products?.length ?? 0
    const stockValue = products?.reduce((total, product) => total + getProductStock(product) * product.buyPrice, 0) ?? 0
    const saleValue = products?.reduce((total, product) => total + getProductStock(product) * product.sellPrice, 0) ?? 0
    const zeroStock = products?.filter((product) => getProductStock(product) <= 0) ?? []
    const negativeMargin = products?.filter((product) => product.sellPrice < product.buyPrice) ?? []

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start overflow-hidden p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">relatório de estoque</h1>
                <p className="text-muted-foreground">valorização, alertas e margem dos produtos cadastrados</p>
            </div>
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

function getProductStock(product: Product) {
    return product.stockMovement.reduce((total, movement) => {
        if (movement.type === "in") return total + movement.quantity
        if (movement.type === "out") return total - movement.quantity
        if (movement.type === "adjustment") return movement.quantity
        return total
    }, 0)
}
