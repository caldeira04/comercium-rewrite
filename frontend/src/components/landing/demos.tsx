import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Metric } from "@/components/metric"
import { CatalogTable } from "@/components/products/catalog-table"
import { SaleItemsTable } from "@/components/sales/sale-items-table"
import { CashOverview } from "@/components/cash/cash-overview"
import { Search, Plus } from "lucide-react"
import { formatCurrency } from "@/utils/finance"
import { dashboardFixtures, pdvFixtures, catalogFixtures, cashFixtures } from "./fixtures"

export function DashboardDemo() {
    const { cash, saleItems, saleTotal, todaySalesCount, todaySalesTotal, productsCount, lowStock, lastSales } = dashboardFixtures

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">dashboard</h1>
                    <p className="text-muted-foreground">visão operacional do ERP local</p>
                </div>
                <div className="flex gap-2">
                    <Button disabled>abrir PDV</Button>
                    <Button disabled variant="secondary">gerenciar caixa</Button>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                <Metric
                    label="caixa atual"
                    value={cash.status === "open" ? "aberto" : "fechado"}
                    detail={`saldo esperado ${formatCurrency(cash.amounts.expectedClosing)}`}
                />
                <Metric
                    label="venda em andamento"
                    value={formatCurrency(saleTotal)}
                    detail={`${saleItems} itens lançados`}
                />
                <Metric
                    label="vendas hoje"
                    value={formatCurrency(todaySalesTotal)}
                    detail={`${todaySalesCount} vendas registradas`}
                />
                <Metric
                    label="produtos críticos"
                    value={String(lowStock.length)}
                    detail={`${productsCount} produtos cadastrados`}
                />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">atalhos</h2>
                        <div className="grid gap-2">
                            <Button disabled variant="outline">catálogo de produtos</Button>
                            <Button disabled variant="outline">histórico de vendas</Button>
                            <Button disabled variant="outline">clientes</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">alertas de estoque</h2>
                        <div className="flex flex-col gap-2">
                            {lowStock.map((product) => (
                                <div key={product.name} className="flex justify-between rounded-lg border p-2">
                                    <span>{product.name}</span>
                                    <span className="font-bold text-red-600">{product.stock}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <h2 className="mb-3 font-bold">últimas vendas</h2>
                        <div className="flex flex-col gap-2">
                            {lastSales.map((sale, index) => (
                                <div key={`${sale.client}-${index}`} className="flex justify-between rounded-lg border p-2">
                                    <span>{sale.client}</span>
                                    <span className="font-bold">{formatCurrency(sale.total)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export function PdvDemo() {
    const total = pdvFixtures.saleItem.reduce((sum, item) => sum + item.totalPrice - (item.discount ?? 0), 0)

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">ponto de venda</h1>
                    <p className="text-muted-foreground">venda rápida com busca de produtos e desconto por item</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input disabled placeholder="buscar produto por nome ou código" className="w-80 pl-8" />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">venda em andamento · cliente: {pdvFixtures.client?.name}</span>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border">
                <SaleItemsTable sale={pdvFixtures} />
            </div>
            <div className="flex items-center justify-end gap-4">
                <span className="text-sm text-muted-foreground">itens excluídos são ocultados e podem ser reativados</span>
                <span className="text-xl font-bold">total: {formatCurrency(total)}</span>
                <Button disabled>finalizar venda</Button>
            </div>
        </div>
    )
}

export function StockDemo() {
    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">catálogo de produtos</h1>
                    <p className="text-muted-foreground">controle de estoque com movimentações e categorias</p>
                </div>
                <Button disabled><Plus />adicionar produto</Button>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border">
                <CatalogTable products={catalogFixtures} />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{catalogFixtures.length} produtos na visão atual</span>
                <span className="text-sm text-muted-foreground">clique em um produto para ver estoque, movimentos e margem</span>
            </div>
        </div>
    )
}

export function CashDemo() {
    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">caixa do dia</h1>
                    <p className="text-muted-foreground">entradas, saídas e formas de pagamento do caixa aberto</p>
                </div>
                <Button disabled>imprimir relatório</Button>
            </div>
            <div className="max-h-96 overflow-auto">
                <CashOverview cash={cashFixtures} />
            </div>
        </div>
    )
}