import { api } from "@/lib/api"

export type EdenData<Endpoint> = Endpoint extends (
    ...args: any[]
) => Promise<infer Response>
    ? Response extends { data: infer Data }
        ? Data
        : never
    : never

export type ArrayItem<Value> = NonNullable<Value> extends readonly (infer Item)[]
    ? Item
    : never

export type CurrentCash = EdenData<typeof api.tenant.cash.current.get>
export type Cashes = EdenData<typeof api.tenant.cash.get>
export type CashListItem = ArrayItem<Cashes>
export type CurrentSale = EdenData<typeof api.tenant.sales.current.get>
export type CurrentSaleItem = ArrayItem<NonNullable<CurrentSale>["saleItem"]>
export type Sales = EdenData<typeof api.tenant.sales.get>
export type SaleListItem = ArrayItem<Sales>
export type Products = EdenData<typeof api.tenant.products.get>
export type Product = ArrayItem<Products>
export type StockMovements = EdenData<typeof api.tenant.stock.movements.get>
export type StockMovement = ArrayItem<StockMovements>
