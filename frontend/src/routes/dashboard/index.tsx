import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Metric } from "@/components/metric"
import { useCash } from "@/hooks/use-cash"
import { useProducts } from "@/hooks/use-products"
import { useSales, useSalesList } from "@/hooks/use-sales"
import { useTenantDates } from "@/hooks/use-tenant-timezone"
import { formatCurrency } from "@/utils/finance"
import type { Product } from "@/lib/api-types"

export const Route = createFileRoute("/dashboard/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending, currentCashIsError } = useCash()
    const { currentSale } = useSales({ loadSales: false })
    const { products, productsIsPending } = useProducts()

    // "Hoje" é o dia corrente no fuso do tenant; o backend filtra pelo mesmo fuso
    const { today } = useTenantDates()
    const { data: todaySalesData, isPending: salesIsPending } = useSalesList({ startDate: today, endDate: today })
    const todaySales = todaySalesData ?? []
    const todayTotal = todaySales.reduce((total, sale) => total + sale.totalAmount, 0)
    const lowStockProducts = products?.filter((product) => getProductStock(product) <= 0) ?? []
    const currentSaleItems = currentSale?.saleItem ?? []
    const currentSaleTotal = currentSaleItems.reduce((total, item) => total + item.totalPrice - (item.discount ?? 0), 0)

    return (
        <main className="flex w-full flex-col gap-4 self-start p-3 md:min-h-svh md:gap-6 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold uppercase md:text-2xl">dashboard</h1>
                    <p className="text-muted-foreground">visão operacional do ERP local</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild className="hidden lg:inline-flex"><Link to="/sales/daily">abrir PDV</Link></Button>
                    <Button asChild variant="outline" className="lg:hidden"><Link to="/assistant">abrir assistente</Link></Button>
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
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
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
                                        <span className="font-bold text-[var(--danger)]">{getProductStock(product)}</span>
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
        </main>
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
