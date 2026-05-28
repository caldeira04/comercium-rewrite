import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useCash } from "@/hooks/use-cash"
import { useProducts } from "@/hooks/use-products"
import { useSales } from "@/hooks/use-sales"
import { formatCurrency } from "@/utils/finance"
import type { Product } from "@/lib/api-types"

export const Route = createFileRoute("/dashboard/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending, currentCashIsError } = useCash()
    const { currentSale, sales, salesIsPending } = useSales()
    const { products, productsIsPending } = useProducts()

    const today = new Date().toLocaleDateString("pt-BR")
    const todaySales = sales?.filter((sale) => new Date(sale.createdAt).toLocaleDateString("pt-BR") === today) ?? []
    const todayTotal = todaySales.reduce((total, sale) => total + sale.totalAmount, 0)
    const lowStockProducts = products?.filter((product) => getProductStock(product) <= 0) ?? []
    const currentSaleItems = currentSale?.saleItem ?? []
    const currentSaleTotal = currentSaleItems.reduce((total, item) => total + item.totalPrice - (item.discount ?? 0), 0)

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">dashboard</h1>
                    <p className="text-muted-foreground">visão operacional do ERP local</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild><Link to="/sales/daily">abrir PDV</Link></Button>
                    <Button asChild variant="secondary"><Link to="/cash/current">gerenciar caixa</Link></Button>
                </div>
            </div>
            {(currentCashIsPending || salesIsPending || productsIsPending) && <Spinner />}
            {currentCashIsError && (
                <Card>
                    <CardContent className="text-muted-foreground">
                        não foi possível carregar o caixa atual; os demais indicadores continuam disponíveis
                    </CardContent>
                </Card>
            )}
            <div className="grid grid-cols-4 gap-4">
                <Metric
                    label="caixa atual"
                    value={currentCash ? currentCash.status === "open" ? "aberto" : "fechado" : "sem caixa"}
                    detail={currentCash ? `saldo esperado ${formatCurrency(currentCash.amounts.expectedClosing)}` : "abra um caixa para vender"}
                />
                <Metric
                    label="venda em andamento"
                    value={currentSale ? formatCurrency(currentSaleTotal) : "nenhuma"}
                    detail={currentSale ? `${currentSaleItems.length} itens lançados` : "PDV livre"}
                />
                <Metric
                    label="vendas hoje"
                    value={formatCurrency(todayTotal)}
                    detail={`${todaySales.length} vendas registradas`}
                />
                <Metric
                    label="produtos críticos"
                    value={String(lowStockProducts.length)}
                    detail={`${products?.length ?? 0} produtos cadastrados`}
                />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">atalhos</h2>
                        <div className="grid gap-2">
                            <Button asChild variant="outline"><Link to="/products/list">catálogo de produtos</Link></Button>
                            <Button asChild variant="outline"><Link to="/sales/list">histórico de vendas</Link></Button>
                            <Button asChild variant="outline"><Link to="/clients">clientes</Link></Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">alertas de estoque</h2>
                        {lowStockProducts.length === 0 ? (
                            <p className="text-muted-foreground">nenhum produto zerado</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {lowStockProducts.slice(0, 8).map((product) => (
                                    <div key={product.id} className="flex justify-between rounded-lg border p-2">
                                        <span>{product.name}</span>
                                        <span className="font-bold text-red-600">{getProductStock(product)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">últimas vendas</h2>
                        {todaySales.length === 0 ? (
                            <p className="text-muted-foreground">nenhuma venda hoje</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {todaySales.slice(0, 8).map((sale) => (
                                    <div key={sale.id} className="flex justify-between rounded-lg border p-2">
                                        <span>{sale.client?.name ?? "cliente não informado"}</span>
                                        <span className="font-bold">{formatCurrency(sale.totalAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function Metric({ label, value, detail }: { label: string, value: string, detail: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}

function getProductStock(product: Product) {
    return (product.stockMovement ?? []).reduce((total, movement) => {
        if (movement.type === "in") return total + movement.quantity
        if (movement.type === "out") return total - movement.quantity
        if (movement.type === "adjustment") return movement.quantity
        return total
    }, 0)
}
