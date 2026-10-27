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
export type Receivables = EdenData<typeof api.tenant.receivables.get>
export type Receivable = ArrayItem<NonNullable<Receivables>["rows"]>
export type ReceivablesExport = EdenData<typeof api.tenant.receivables.export.get>
export type Payables = EdenData<typeof api.tenant.payables.get>
export type Payable = ArrayItem<NonNullable<Payables>["rows"]>
export type PayablesExport = EdenData<typeof api.tenant.payables.export.get>
export type Payees = EdenData<typeof api.tenant.payees.get>
export type Payee = ArrayItem<Payees>
export type BankAccounts = EdenData<(typeof api.tenant)["bank-accounts"]["get"]>
export type BankAccount = ArrayItem<BankAccounts>
export type ExpenseCategories = EdenData<(typeof api.tenant)["expense-categories"]["get"]>
export type ExpenseCategory = ArrayItem<ExpenseCategories>
