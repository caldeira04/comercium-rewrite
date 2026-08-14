import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Product } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"

export function CatalogTable({ products, onSelect }: {
    products: Product[]
    onSelect?: (product: Product) => void
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[90px]">ID</TableHead>
                    <TableHead>produto</TableHead>
                    <TableHead>categoria</TableHead>
                    <TableHead>GTIN</TableHead>
                    <TableHead className="text-right">estoque</TableHead>
                    <TableHead className="text-right">custo</TableHead>
                    <TableHead className="text-right">venda</TableHead>
                    <TableHead className="text-right">margem</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map((product) => {
                    const stock = getProductStock(product)
                    const margin = product.sellPrice - product.buyPrice

                    return (
                        <TableRow
                            key={product.id}
                            className={onSelect ? "cursor-pointer" : undefined}
                            onClick={onSelect ? () => onSelect(product) : undefined}
                        >
                            <TableCell className="font-medium">{product.id}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.category?.name ?? "-"}</TableCell>
                            <TableCell>{product.gtin ?? "-"}</TableCell>
                            <TableCell className={stock <= 0 ? "text-right font-bold text-red-600" : "text-right"}>{stock}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.buyPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.sellPrice)}</TableCell>
                            <TableCell className={margin < 0 ? "text-right text-red-600" : "text-right text-green-600"}>{formatCurrency(margin)}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

export function getProductStock(product: Product) {
    return product.stockMovement.reduce((total, movement) => {
        if (movement.type === "in") return total + movement.quantity
        if (movement.type === "out") return total - movement.quantity
        if (movement.type === "adjustment") return movement.quantity
        return total
    }, 0)
}