export const paymentMethodOptions = [
    { value: "cash", label: "dinheiro" },
    { value: "pix", label: "PIX" },
    { value: "debit", label: "débito" },
    { value: "credit", label: "crédito" },
    { value: "voucher", label: "cheque" },
] as const

export type PaymentMethodValue = (typeof paymentMethodOptions)[number]["value"]

export const payeeKindOptions = [
    { value: "supplier", label: "fornecedor" },
    { value: "employee", label: "funcionário" },
    { value: "other", label: "outros" },
] as const

export type PayeeKindValue = (typeof payeeKindOptions)[number]["value"]

export const bankAccountKindOptions = [
    { value: "checking", label: "conta corrente" },
    { value: "savings", label: "poupança" },
    { value: "cash", label: "caixa" },
    { value: "other", label: "outros" },
] as const

export type BankAccountKindValue = (typeof bankAccountKindOptions)[number]["value"]

export const payableStatusLabels: Record<string, string> = {
    paid: "pago",
    pending: "pendente",
    overdue: "vencido",
}

export function formatPayeeKind(kind: string) {
    return payeeKindOptions.find((option) => option.value === kind)?.label ?? kind
}

export function formatBankAccountKind(kind: string) {
    return bankAccountKindOptions.find((option) => option.value === kind)?.label ?? kind
}
