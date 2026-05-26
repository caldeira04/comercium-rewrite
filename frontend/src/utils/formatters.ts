const cashMovementNatureMap = {
    in: "entrada",
    out: "saída",
} as const

export function formatCashMovementNature({
    nature,
}: {
    nature: "in" | "out"
}) {
    return cashMovementNatureMap[nature]
}

const cashMovementTypeMap = {
    payment: "pagamento",
    drop: "sangria",
    topup: "suprimento",
    open: "abertura",
    refund: "estorno"
} as const

export function formatCashMovementType({
    type,
}: {
    type: "payment" | "drop" | "topup" | "open" | "refund"
}) {
    return cashMovementTypeMap[type]
}

const paymentMethodMap = {
    cash: "dinheiro",
    pix: "PIX",
    debit: "débito",
    credit: "crédito",
    voucher: "cheque",
}

export function formatPaymentMethod({
    method,
}: {
    method: "cash" | "pix" | "debit" | "credit" | "voucher"
}) {
    return paymentMethodMap[method]
}

