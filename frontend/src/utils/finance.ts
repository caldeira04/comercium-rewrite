
export function translatePaymentMethod(method: "cash" | "debit" | "credit" | "pix" | "voucher") {
    switch (method) {
        case ("cash"): return "dinheiro"
        case ("debit"): return "débito"
        case ("credit"): return "crédito"
        case ("pix"): return "PIX"
        case ("voucher"): return "cheque"
        default: null
    }
}

export function formatCurrency(amount: number) {
    const formatted = `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`
    return formatted
}

export function maskCurrency(input: string) {
    const raw = input.replace(/\D/g, "")
    const float = Number(raw) / 100

    return float.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    })
}
