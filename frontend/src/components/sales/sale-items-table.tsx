import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { CurrentSale, CurrentSaleItem } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { PencilIcon, RotateCcwIcon, TrashIcon } from "lucide-react"

export interface SaleItemsTableProps {
    sale: NonNullable<CurrentSale>
    onEditSaleItem?: (saleItem: CurrentSaleItem) => void
    onRemoveSaleItem?: (saleItem: CurrentSaleItem) => void
    onReactivateSaleItem?: (saleItem: CurrentSaleItem) => void
    removeSaleItemIsPending?: boolean
    reactivateSaleItemIsPending?: boolean
}

export function SaleItemsTable({
    sale,
    onEditSaleItem,
    onRemoveSaleItem,
    onReactivateSaleItem,
    removeSaleItemIsPending = false,
    reactivateSaleItemIsPending = false,
}: SaleItemsTableProps) {
    const activeItems = sale.saleItem.filter((item) => !item.deletedAt)
    const deletedItems = sale.saleItem.filter((item) => item.deletedAt)

    return (
        <Table className="min-h-full">
            <TableHeader>
                <TableRow>
                    <TableHead>produto</TableHead>
                    <TableHead>preço un.</TableHead>
                    <TableHead>qtd.</TableHead>
                    <TableHead>subtotal</TableHead>
                    <TableHead>desconto</TableHead>
                    <TableHead>total</TableHead>
                    <TableHead className="text-right">ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {activeItems.map((item) => (
                    <SaleItemRow
                        key={item.id}
                        item={item}
                        onEditSaleItem={onEditSaleItem}
                        onRemoveSaleItem={onRemoveSaleItem}
                        onReactivateSaleItem={onReactivateSaleItem}
                        removeSaleItemIsPending={removeSaleItemIsPending}
                        reactivateSaleItemIsPending={reactivateSaleItemIsPending}
                    />
                ))}
                {deletedItems.length > 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="bg-muted/60 py-2 text-xs font-bold uppercase text-muted-foreground">
                            itens excluídos
                        </TableCell>
                    </TableRow>
                )}
                {deletedItems.map((item) => (
                    <SaleItemRow
                        key={item.id}
                        item={item}
                        onEditSaleItem={onEditSaleItem}
                        onRemoveSaleItem={onRemoveSaleItem}
                        onReactivateSaleItem={onReactivateSaleItem}
                        removeSaleItemIsPending={removeSaleItemIsPending}
                        reactivateSaleItemIsPending={reactivateSaleItemIsPending}
                    />
                ))}
            </TableBody>
        </Table>
    )
}

function SaleItemRow({
    item,
    onEditSaleItem,
    onRemoveSaleItem,
    onReactivateSaleItem,
    removeSaleItemIsPending,
    reactivateSaleItemIsPending,
}: {
    item: CurrentSaleItem
    onEditSaleItem?: (saleItem: CurrentSaleItem) => void
    onRemoveSaleItem?: (saleItem: CurrentSaleItem) => void
    onReactivateSaleItem?: (saleItem: CurrentSaleItem) => void
    removeSaleItemIsPending: boolean
    reactivateSaleItemIsPending: boolean
}) {
    const isDeleted = !!item.deletedAt

    return (
        <TableRow className={isDeleted ? "bg-destructive/5 text-muted-foreground" : undefined}>
            <TableCell className={isDeleted ? "line-through" : undefined}>{item.product.name}</TableCell>
            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
            <TableCell>{formatCurrency(item.discount ?? 0)}</TableCell>
            <TableCell>{formatCurrency(item.totalPrice - (item.discount ?? 0))}</TableCell>
            <TableCell className="text-right">
                {isDeleted ? (
                    <Button
                        variant="outline"
                        disabled={reactivateSaleItemIsPending}
                        onClick={onReactivateSaleItem ? () => onReactivateSaleItem(item) : undefined}
                    ><RotateCcwIcon />reativar</Button>
                ) : (
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={onEditSaleItem ? () => onEditSaleItem(item) : undefined}
                        ><PencilIcon /></Button>
                        <Button
                            variant="destructive"
                            disabled={removeSaleItemIsPending}
                            onClick={onRemoveSaleItem ? () => onRemoveSaleItem(item) : undefined}
                        ><TrashIcon /></Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}