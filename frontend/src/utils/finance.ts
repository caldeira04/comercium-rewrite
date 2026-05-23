
export function translatePaymentMethod(method: "cash" | "debit" | "credit" | "pix") {
    switch (method) {
        case ("cash"): return "dinheiro"
        case ("debit"): return "débito"
        case ("credit"): return "crédito"
        case ("pix"): return "PIX"
        default: null
    }
}

export function formatCurrency(amount: number) {
    const formatted = `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`
    return formatted
}
