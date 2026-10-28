import { and, eq, isNull, sql } from "drizzle-orm"
import { getTenantDb } from "@/db/db"
import { client, product } from "@/db/schema/tenant"
import { createClient, editClient } from "../tenant/client/ClientService"
import { createProduct, createProducts, updateProduct, updateProductPrices } from "../tenant/products/ProductsService"
import { createCashMovement, currentCash } from "../tenant/cash/CashService"
import { createStockPurchase, createStockPurchaseBatch } from "../tenant/payables/StockPurchaseService"
import { findOwnAttachment, readAttachmentText } from "./attachments"
import { parseNfe } from "./nfe"
import { assistantAction } from "@/db/schema/tenant"
import { createExpenseCategory } from "../tenant/payables/ExpenseCategoriesService"
import { getCategories } from "../tenant/category/CategoryService"
import { getBankAccounts } from "../tenant/payables/BankAccountsService"
import { getExpenseCategories } from "../tenant/payables/ExpenseCategoriesService"
import { createPayee, getPayees, payeeKinds, type PayeeKind } from "../tenant/payables/PayeesService"
import {
    createPayable,
    createPayables,
    installmentModes,
    paymentMethods,
    payPayable,
    preparePayableRows,
    reversePayable,
    type CreatePayableInput,
    type InstallmentMode,
    type PaymentMethod,
} from "../tenant/payables/PayablesService"
import { AppError } from "../../utils/errors"
import { isValidDateInput } from "../../utils/dates"

// Valores editáveis no cartão: dinheiro em centavos, datas AAAA-MM-DD e
// seleções pelo id em texto
export type ActionScalar = string | number | boolean | null
// Linha de um cartão em lote; "include" diz se a linha será executada
export type ActionRowValues = Record<string, ActionScalar>
export type ActionValue = ActionScalar | ActionRowValues[]
export type ActionValues = Record<string, ActionValue>

export type ActionField = {
    key: string
    label: string
    kind: "text" | "textarea" | "money" | "date" | "integer" | "select" | "boolean" | "rows"
    required?: boolean
    readOnly?: boolean
    options?: { value: string, label: string }[]
    // Colunas de um campo "rows"
    columns?: ActionField[]
}

const MAX_BATCH_ROWS = 50

export type ActionContext = {
    tenantSlug: string
    timeZone: string
    today: string
    // Quem está conversando; usado para ler anexos do próprio usuário
    userId?: string
}

export type ActionProposal = {
    values: ActionValues
    warnings: string[]
    // Valores atuais do registro, nas ações de edição (cartão mostra antes → depois)
    previousValues?: ActionValues
}

export type ActionResult = {
    referenceType: string
    referenceId: string
}

type ActionDefinition = {
    type: string
    label: string
    description: string
    parameters: {
        type: "object"
        properties: Record<string, unknown>
        required?: string[]
        additionalProperties: false
    }
    // Converte os argumentos do modelo em valores do cartão
    propose: (args: Record<string, unknown>, context: ActionContext) => Promise<ActionProposal>
    // Valores guardados permitem campos que só aparecem em alguns cartões
    fields: (context: ActionContext, values: ActionValues) => Promise<ActionField[]>
    // Lança AppError se os valores não puderem ser executados
    check: (values: ActionValues, context: ActionContext) => Promise<void>
    // false quando a proposta já nasce com campos para o usuário completar no cartão
    checkOnPropose?: boolean
    execute: (values: ActionValues, context: ActionContext & { userId: string }) => Promise<ActionResult>
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: "dinheiro",
    pix: "PIX",
    debit: "débito",
    credit: "crédito",
    voucher: "cheque",
}

const installmentModeLabels: Record<InstallmentMode, string> = {
    recurring: "repetir o valor todo mês",
    installment: "dividir o valor nas parcelas",
}

function normalizeName(value: string) {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

function textArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (value === undefined || value === null) return null
    if (typeof value !== "string") {
        throw new AppError(`${key} deve ser um texto`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value.trim() || null
}

function reaisArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (value === undefined || value === null) return null

    const number = typeof value === "string" ? Number(value.replace(/\./g, "").replace(",", ".")) : value
    if (typeof number !== "number" || !Number.isFinite(number) || number < 0) {
        throw new AppError(`${key} deve ser um valor em reais`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return Math.round(number * 100)
}

function intArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (value === undefined || value === null) return null
    if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new AppError(`${key} deve ser um número inteiro`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value
}

function dateArg(args: Record<string, unknown>, key: string) {
    const value = textArg(args, key)
    if (value !== null && !isValidDateInput(value)) {
        throw new AppError(`${key} deve ser uma data no formato AAAA-MM-DD`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value
}

function enumArg<T extends string>(args: Record<string, unknown>, key: string, mapping: Record<string, T>) {
    const value = textArg(args, key)
    if (value === null) return null

    const mapped = mapping[normalizeName(value)]
    if (!mapped) {
        throw new AppError(`${key} deve ser um destes: ${Object.keys(mapping).join(", ")}`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return mapped
}

// Procura um cadastro pelo nome. Um resultado: usa. Vários: devolve ao modelo
// para perguntar. Nenhum: deixa em branco e avisa no cartão.
export function resolveByName(
    label: string,
    options: { id: string | number, name: string | null }[],
    name: string | null,
    warnings: string[],
) {
    if (!name) return null

    const wanted = normalizeName(name)
    const named = options.filter((option) => option.name)
    const exact = named.filter((option) => normalizeName(option.name!) === wanted)
    const matches = exact.length > 0
        ? exact
        : named.filter((option) => normalizeName(option.name!).includes(wanted))

    if (matches.length === 1) return String(matches[0].id)

    if (matches.length > 1) {
        const names = matches.slice(0, 8).map((option) => option.name).join(", ")
        throw new AppError(
            `há mais de uma opção de ${label} parecida com "${name}": ${names}. Pergunte ao usuário qual delas.`,
            400,
            "AMBIGUOUS_REFERENCE",
        )
    }

    warnings.push(`Não encontrei ${label} "${name}"; o campo ficou em branco.`)
    return null
}

function stringValue(values: ActionValues, key: string) {
    const value = values[key]
    return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(values: ActionValues, key: string) {
    const value = values[key]
    return typeof value === "number" ? value : null
}

function requiredText(values: ActionValues, key: string, label: string) {
    const value = stringValue(values, key)
    if (!value) throw new AppError(`informe ${label}`, 400, "INVALID_ACTION_VALUE")
    return value
}

function requiredMoney(values: ActionValues, key: string, label: string, allowZero = false) {
    const value = numberValue(values, key)
    if (value === null || !Number.isInteger(value) || value < 0 || (!allowZero && value === 0)) {
        throw new AppError(`informe ${label}`, 400, "INVALID_ACTION_VALUE")
    }

    return value
}

async function payeeOptions(tenantSlug: string) {
    return (await getPayees(tenantSlug)).map((row) => ({ id: row.id, name: row.name }))
}

async function expenseCategoryOptions(tenantSlug: string) {
    return (await getExpenseCategories(tenantSlug)).map((row) => ({ id: row.id, name: row.name }))
}

async function bankAccountOptions(tenantSlug: string) {
    return (await getBankAccounts(tenantSlug))
        .filter((row) => row.isActive)
        .map((row) => ({ id: row.id, name: row.name }))
}

async function productCategoryOptions(tenantSlug: string) {
    return (await getCategories(tenantSlug)).map((row) => ({ id: row.id, name: row.name }))
}

function toOptions(rows: { id: string | number, name: string | null }[]) {
    return rows.map((row) => ({ value: String(row.id), label: row.name ?? String(row.id) }))
}

const paymentMethodArg = {
    type: "string",
    enum: ["dinheiro", "pix", "debito", "credito", "cheque"],
    description: "Forma de pagamento, se o usuário disser.",
}

const paymentMethodMapping: Record<string, PaymentMethod> = {
    dinheiro: "cash",
    pix: "pix",
    debito: "debit",
    credito: "credit",
    cheque: "voucher",
}

const paymentMethodOptions = paymentMethods.map((method) => ({ value: method, label: paymentMethodLabels[method] }))

function payableInput(values: ActionValues, userId: string): CreatePayableInput {
    const installmentCount = numberValue(values, "installmentCount") ?? 1
    const installmentMode = stringValue(values, "installmentMode") as InstallmentMode | null

    return {
        description: requiredText(values, "description", "a descrição"),
        amount: requiredMoney(values, "amount", "o valor"),
        dueDate: stringValue(values, "dueDate") ?? "",
        paymentMethod: stringValue(values, "paymentMethod") as PaymentMethod | null,
        payeeId: stringValue(values, "payeeId"),
        categoryId: stringValue(values, "categoryId"),
        bankAccountId: stringValue(values, "bankAccountId"),
        notes: stringValue(values, "notes"),
        installments: { count: installmentCount, mode: installmentMode ?? "recurring" },
        userId,
    }
}

async function findOpenPayable(tenantSlug: string, payableId: string | null) {
    if (!payableId) throw new AppError("informe a conta", 400, "INVALID_ACTION_VALUE")

    const db = getTenantDb(tenantSlug)
    const found = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, payableId), isNull(payable.deletedAt)),
    })

    if (!found) throw new AppError("conta a pagar não encontrada", 404, "PAYABLE_NOT_FOUND")
    if (found.paidDate) throw new AppError("esta conta já está paga", 409, "PAYABLE_ALREADY_PAID")

    return found
}

type ProductRow = {
    id: number
    name: string
    sellPrice: number
    buyPrice: number
    gtin: string | null
    categoryId: number | null
}

async function productRows(tenantSlug: string): Promise<ProductRow[]> {
    const db = getTenantDb(tenantSlug)
    return await db
        .select({
            id: product.id,
            name: product.name,
            sellPrice: product.sellPrice,
            buyPrice: product.buyPrice,
            gtin: product.gtin,
            categoryId: product.categoryId,
        })
        .from(product)
        .where(and(isNull(product.deletedAt), sql`${product.id} <> 0`))
}

// Produto pelo id (de consultar_estoque), pelo código de barras ou pelo nome
async function findProduct(tenantSlug: string, args: Record<string, unknown>) {
    const rows = await productRows(tenantSlug)
    const productId = intArg(args, "produtoId")
    if (productId !== null) {
        const found = rows.find((row) => row.id === productId)
        if (!found) throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")
        return found
    }

    const term = textArg(args, "produto")
    if (!term) throw new AppError("informe o produto (nome, código de barras ou produtoId)", 400, "INVALID_TOOL_ARGUMENT")

    const byGtin = rows.filter((row) => row.gtin === term)
    if (byGtin.length === 1) return byGtin[0]

    const warnings: string[] = []
    const id = resolveByName("produto", rows, term, warnings)
    if (!id) throw new AppError(`não encontrei o produto "${term}"; para criar, use cadastrar_produto`, 404, "PRODUCT_NOT_FOUND")

    return rows.find((row) => String(row.id) === id)!
}

async function loadProduct(tenantSlug: string, productId: ActionValue) {
    const rows = await productRows(tenantSlug)
    const found = rows.find((row) => row.id === Number(productId))
    if (!found) throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")
    return found
}

async function assertUniqueGtin(tenantSlug: string, gtin: string | null, exceptProductId?: number) {
    if (!gtin) return

    const db = getTenantDb(tenantSlug)
    const existing = await db
        .select({ id: product.id, name: product.name })
        .from(product)
        .where(and(isNull(product.deletedAt), eq(product.gtin, gtin)))

    const other = existing.find((row) => row.id !== exceptProductId)
    if (other) {
        throw new AppError(`já existe um produto com este código de barras: ${other.name}`, 409, "PRODUCT_GTIN_TAKEN")
    }
}

async function assertProductCategory(tenantSlug: string, categoryId: string | null) {
    if (!categoryId) return

    const categories = await productCategoryOptions(tenantSlug)
    if (!categories.some((category) => String(category.id) === categoryId)) {
        throw new AppError("categoria não encontrada", 400, "CATEGORY_NOT_FOUND")
    }
}

async function loadClient(tenantSlug: string, clientId: ActionValue) {
    if (Number(clientId) === 0) {
        throw new AppError("não é possível editar o cliente \"Consumidor Final\"", 409, "DEFAULT_CLIENT_IMMUTABLE")
    }

    const db = getTenantDb(tenantSlug)
    const found = await db.query.client.findFirst({
        where: (client, { and, eq, isNull }) => and(eq(client.id, Number(clientId)), isNull(client.deletedAt)),
    })
    if (!found) throw new AppError("cliente não encontrado", 404, "CLIENT_NOT_FOUND")

    return found
}

async function assertClientFields(tenantSlug: string, values: ActionValues, exceptClientId?: number) {
    requiredText(values, "name", "o nome do cliente")

    const email = stringValue(values, "email")
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError("e-mail inválido", 400, "INVALID_ACTION_VALUE")
    }

    const document = stringValue(values, "document")
    if (document) {
        const db = getTenantDb(tenantSlug)
        const existing = await db
            .select({ id: client.id, name: client.name })
            .from(client)
            .where(and(isNull(client.deletedAt), eq(client.document, document)))

        const other = existing.find((row) => row.id !== exceptClientId)
        if (other) {
            throw new AppError(`já existe um cliente com este documento: ${other.name}`, 409, "CLIENT_DOCUMENT_TAKEN")
        }
    }
}

async function openCash(tenantSlug: string) {
    const cash = await currentCash(tenantSlug)
    if (!cash || cash.status !== "open") {
        throw new AppError("não há caixa aberto; abra o caixa antes", 409, "CASH_NOT_OPEN")
    }

    return cash
}

async function findPaidPayable(tenantSlug: string, payableId: string | null) {
    if (!payableId) throw new AppError("informe a conta", 400, "INVALID_ACTION_VALUE")

    const db = getTenantDb(tenantSlug)
    const found = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, payableId), isNull(payable.deletedAt)),
    })

    if (!found) throw new AppError("conta a pagar não encontrada", 404, "PAYABLE_NOT_FOUND")
    if (!found.paidDate) throw new AppError("esta conta não está paga", 409, "PAYABLE_NOT_PAID")

    return found
}

const payeeKindMapping: Record<string, PayeeKind> = {
    fornecedor: "supplier",
    funcionario: "employee",
    outros: "other",
}

const payeeKindLabels: Record<PayeeKind, string> = {
    supplier: "fornecedor",
    employee: "funcionário",
    other: "outros",
}

function rowsValue(values: ActionValues, key = "rows") {
    const value = values[key]
    return Array.isArray(value) ? value : []
}

function includedRows(values: ActionValues, key = "rows") {
    const rows = rowsValue(values, key).filter((row) => row.include !== false)
    if (rows.length === 0) throw new AppError("marque pelo menos uma linha", 400, "INVALID_ACTION_VALUE")
    return rows
}

// Valida cada linha marcada, apontando o número da linha no cartão
async function checkEachRow(values: ActionValues, check: (row: ActionRowValues) => Promise<void> | void, key = "rows") {
    includedRows(values, key)
    for (const [index, row] of rowsValue(values, key).entries()) {
        if (row.include === false) continue
        try {
            await check(row)
        } catch (error) {
            if (error instanceof AppError) throw new AppError(`linha ${index + 1}: ${error.message}`, error.statusCode, error.code)
            throw error
        }
    }
}

function arrayArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (!Array.isArray(value) || value.length === 0) {
        throw new AppError(`${key} deve ser uma lista com pelo menos um item`, 400, "INVALID_TOOL_ARGUMENT")
    }
    if (value.length > MAX_BATCH_ROWS) {
        throw new AppError(`no máximo ${MAX_BATCH_ROWS} itens por vez; divida o pedido`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value.map((item) => (item && typeof item === "object" ? item : {}) as Record<string, unknown>)
}

// Arredonda para cima até o preço terminar nos centavos pedidos (ex.: ,90)
function withEnding(price: number, ending: number) {
    const rounded = Math.floor(price / 100) * 100 + ending
    return rounded < price ? rounded + 100 : rounded
}

const NEW_PRODUCT = "__novo__"

async function assertNfeNotImported(tenantSlug: string, accessKey: string) {
    const db = getTenantDb(tenantSlug)
    const imported = await db
        .select({ decidedAt: assistantAction.decidedAt })
        .from(assistantAction)
        .where(and(
            eq(assistantAction.type, "importar_nfe"),
            eq(assistantAction.status, "executed"),
            sql`json_extract(${assistantAction.values}, '$.accessKey') = ${accessKey}`,
        ))
        .limit(1)

    if (imported[0]) {
        throw new AppError(`esta NF-e já foi importada em ${imported[0].decidedAt?.slice(0, 10)}`, 409, "NFE_ALREADY_IMPORTED")
    }
}

const includeColumn: ActionField = { key: "include", label: "Incluir", kind: "boolean" }

async function assertBankAccount(tenantSlug: string, bankAccountId: string | null) {
    if (!bankAccountId) return

    const accounts = await bankAccountOptions(tenantSlug)
    if (!accounts.some((account) => account.id === bankAccountId)) {
        throw new AppError("conta bancária não encontrada", 400, "BANK_ACCOUNT_NOT_FOUND")
    }
}

const actionDefinitions: ActionDefinition[] = [
    {
        type: "lancar_conta_a_pagar",
        label: "Lançar conta a pagar",
        description: "Prepara o lançamento de uma conta a pagar (despesa). Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                descricao: { type: "string", description: "Descrição da conta, ex.: \"Conta de luz\"." },
                valor: { type: "number", description: "Valor em reais. Com parcelas no modo parcelar, é o valor total." },
                vencimento: { type: "string", description: "Data de vencimento (AAAA-MM-DD). Com parcelas, é o vencimento da primeira." },
                favorecido: { type: "string", description: "Nome do favorecido (fornecedor, funcionário…), se o usuário disser." },
                categoria: { type: "string", description: "Nome da categoria de despesa, se o usuário disser." },
                contaBancaria: { type: "string", description: "Nome da conta bancária de pagamento, se o usuário disser." },
                formaPagamento: paymentMethodArg,
                parcelas: { type: "integer", description: "Número de lançamentos mensais (1 a 60). Padrão: 1." },
                modoParcelas: { type: "string", enum: ["repetir", "parcelar"], description: "repetir: cada mês com o valor informado (conta recorrente). parcelar: divide o valor total entre as parcelas." },
                observacoes: { type: "string", description: "Observações livres." },
            },
            required: ["descricao", "valor", "vencimento"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const warnings: string[] = []
            const [payees, categories, accounts] = await Promise.all([
                payeeOptions(context.tenantSlug),
                expenseCategoryOptions(context.tenantSlug),
                bankAccountOptions(context.tenantSlug),
            ])

            // Favorecido inexistente pode ser criado junto com a conta
            const payeeName = textArg(args, "favorecido")
            const payeeLookupWarnings: string[] = []
            const payeeId = resolveByName("favorecido", payees, payeeName, payeeLookupWarnings)
            if (payeeName && !payeeId) {
                warnings.push(`O favorecido "${payeeName}" não existe e será criado ao confirmar. Apague o campo "Novo favorecido" para não criar.`)
            }

            const values: ActionValues = {
                description: textArg(args, "descricao"),
                amount: reaisArg(args, "valor"),
                dueDate: dateArg(args, "vencimento"),
                payeeId,
                newPayeeName: payeeName && !payeeId ? payeeName : null,
                // Campo oculto: o cartão só mostra "Novo favorecido" quando ele foi oferecido
                offerNewPayee: Boolean(payeeName && !payeeId),
                categoryId: resolveByName("categoria", categories, textArg(args, "categoria"), warnings),
                bankAccountId: resolveByName("conta bancária", accounts, textArg(args, "contaBancaria"), warnings),
                paymentMethod: enumArg(args, "formaPagamento", paymentMethodMapping),
                installmentCount: intArg(args, "parcelas") ?? 1,
                installmentMode: enumArg(args, "modoParcelas", { repetir: "recurring", parcelar: "installment" }) ?? "recurring",
                notes: textArg(args, "observacoes"),
            }

            if (values.dueDate && values.dueDate < context.today) {
                warnings.push("O vencimento está no passado.")
            }

            return { values, warnings }
        },
        async fields(context, values) {
            const [payees, categories, accounts] = await Promise.all([
                payeeOptions(context.tenantSlug),
                expenseCategoryOptions(context.tenantSlug),
                bankAccountOptions(context.tenantSlug),
            ])

            return [
                { key: "description", label: "Descrição", kind: "text", required: true },
                { key: "amount", label: "Valor", kind: "money", required: true },
                { key: "dueDate", label: "Vencimento", kind: "date", required: true },
                { key: "payeeId", label: "Favorecido", kind: "select", options: toOptions(payees) },
                ...(values.offerNewPayee === true
                    ? [{ key: "newPayeeName", label: "Novo favorecido", kind: "text" as const }]
                    : []),
                { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
                { key: "bankAccountId", label: "Conta bancária", kind: "select", options: toOptions(accounts) },
                { key: "paymentMethod", label: "Forma de pagamento", kind: "select", options: paymentMethodOptions },
                { key: "installmentCount", label: "Parcelas", kind: "integer", required: true },
                {
                    key: "installmentMode",
                    label: "Modo das parcelas",
                    kind: "select",
                    required: true,
                    options: installmentModes.map((mode) => ({ value: mode, label: installmentModeLabels[mode] })),
                },
                { key: "notes", label: "Observações", kind: "textarea" },
            ]
        },
        async check(values, context) {
            await preparePayableRows(getTenantDb(context.tenantSlug), payableInput(values, ""))
        },
        async execute(values, context) {
            const newPayeeName = stringValue(values, "newPayeeName")
            let payeeId = stringValue(values, "payeeId")
            if (!payeeId && newPayeeName) {
                payeeId = (await createPayee(context.tenantSlug, { name: newPayeeName, userId: context.userId })).id
            }

            const { payables, groupId } = await createPayable(context.tenantSlug, {
                ...payableInput(values, context.userId),
                payeeId,
            })
            return { referenceType: "payable", referenceId: groupId ?? payables[0].id }
        },
    },
    {
        type: "baixar_conta_a_pagar",
        label: "Dar baixa em conta a pagar",
        description: "Prepara a baixa (pagamento) de uma conta a pagar pendente. Use o id retornado por contas_a_pagar. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                contaId: { type: "string", description: "id da conta, vindo de contas_a_pagar." },
                dataPagamento: { type: "string", description: "Data do pagamento (AAAA-MM-DD). Padrão: hoje. Não pode ser futura." },
                contaBancaria: { type: "string", description: "Nome da conta bancária usada, se o usuário disser." },
                formaPagamento: paymentMethodArg,
            },
            required: ["contaId"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const warnings: string[] = []
            const found = await findOpenPayable(context.tenantSlug, textArg(args, "contaId"))
            const accounts = await bankAccountOptions(context.tenantSlug)

            return {
                values: {
                    payableId: found.id,
                    description: found.installmentCount > 1
                        ? `${found.description} (${found.installmentNumber}/${found.installmentCount})`
                        : found.description,
                    amount: found.amount,
                    dueDate: found.dueDate,
                    paidDate: dateArg(args, "dataPagamento") ?? context.today,
                    bankAccountId: resolveByName("conta bancária", accounts, textArg(args, "contaBancaria"), warnings)
                        ?? found.bankAccountId,
                    paymentMethod: enumArg(args, "formaPagamento", paymentMethodMapping) ?? found.paymentMethod,
                },
                warnings,
            }
        },
        async fields(context) {
            const accounts = await bankAccountOptions(context.tenantSlug)

            return [
                { key: "description", label: "Conta", kind: "text", readOnly: true },
                { key: "amount", label: "Valor", kind: "money", readOnly: true },
                { key: "dueDate", label: "Vencimento", kind: "date", readOnly: true },
                { key: "paidDate", label: "Data do pagamento", kind: "date", required: true },
                { key: "bankAccountId", label: "Conta bancária", kind: "select", options: toOptions(accounts) },
                { key: "paymentMethod", label: "Forma de pagamento", kind: "select", options: paymentMethodOptions },
            ]
        },
        async check(values, context) {
            await findOpenPayable(context.tenantSlug, stringValue(values, "payableId"))

            const paidDate = stringValue(values, "paidDate")
            if (!paidDate || !isValidDateInput(paidDate)) {
                throw new AppError("informe uma data de pagamento válida", 400, "INVALID_ACTION_VALUE")
            }
            if (paidDate > context.today) {
                throw new AppError("a data do pagamento não pode ser futura", 400, "INVALID_PAYMENT_DATE")
            }

            await assertBankAccount(context.tenantSlug, stringValue(values, "bankAccountId"))
        },
        async execute(values, context) {
            const updated = await payPayable(context.tenantSlug, {
                payableId: stringValue(values, "payableId")!,
                userId: context.userId,
                paidDate: stringValue(values, "paidDate")!,
                bankAccountId: stringValue(values, "bankAccountId"),
                paymentMethod: stringValue(values, "paymentMethod") as PaymentMethod | null,
                timeZone: context.timeZone,
            })

            return { referenceType: "payable", referenceId: updated.id }
        },
    },
    {
        type: "cadastrar_cliente",
        label: "Cadastrar cliente",
        description: "Prepara o cadastro de um cliente. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                nome: { type: "string", description: "Nome do cliente." },
                documento: { type: "string", description: "CPF ou CNPJ, se informado." },
                email: { type: "string", description: "E-mail, se informado." },
                telefone: { type: "string", description: "Telefone, se informado." },
            },
            required: ["nome"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const values: ActionValues = {
                name: textArg(args, "nome"),
                document: textArg(args, "documento"),
                email: textArg(args, "email"),
                phone: textArg(args, "telefone"),
            }

            const warnings: string[] = []
            if (values.name) {
                const db = getTenantDb(context.tenantSlug)
                const sameName = await db
                    .select({ id: client.id })
                    .from(client)
                    .where(and(isNull(client.deletedAt), sql`lower(${client.name}) = lower(${values.name})`))
                    .limit(1)

                if (sameName[0]) warnings.push(`Já existe um cliente chamado "${values.name}".`)
            }

            return { values, warnings }
        },
        async fields() {
            return [
                { key: "name", label: "Nome", kind: "text", required: true },
                { key: "document", label: "CPF/CNPJ", kind: "text" },
                { key: "email", label: "E-mail", kind: "text" },
                { key: "phone", label: "Telefone", kind: "text" },
            ]
        },
        async check(values, context) {
            requiredText(values, "name", "o nome do cliente")

            const email = stringValue(values, "email")
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new AppError("e-mail inválido", 400, "INVALID_ACTION_VALUE")
            }

            const document = stringValue(values, "document")
            if (document) {
                const db = getTenantDb(context.tenantSlug)
                const existing = await db
                    .select({ name: client.name })
                    .from(client)
                    .where(and(isNull(client.deletedAt), eq(client.document, document)))
                    .limit(1)

                if (existing[0]) {
                    throw new AppError(`já existe um cliente com este documento: ${existing[0].name}`, 409, "CLIENT_DOCUMENT_TAKEN")
                }
            }
        },
        async execute(values, context) {
            const created = await createClient(context.tenantSlug, {
                name: stringValue(values, "name")!,
                document: stringValue(values, "document") ?? undefined,
                email: stringValue(values, "email") ?? undefined,
                phone: stringValue(values, "phone") ?? undefined,
                userId: context.userId,
            })

            return { referenceType: "client", referenceId: String(created.id) }
        },
    },
    {
        type: "cadastrar_produto",
        label: "Cadastrar produto",
        description: "Prepara o cadastro de um produto. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                nome: { type: "string", description: "Nome do produto." },
                precoVenda: { type: "number", description: "Preço de venda em reais." },
                precoCusto: { type: "number", description: "Preço de custo em reais, se informado." },
                codigoBarras: { type: "string", description: "Código de barras (GTIN/EAN), se informado." },
                categoria: { type: "string", description: "Nome da categoria do produto, se o usuário disser." },
            },
            required: ["nome", "precoVenda"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const warnings: string[] = []
            const categories = await productCategoryOptions(context.tenantSlug)
            const values: ActionValues = {
                name: textArg(args, "nome"),
                sellPrice: reaisArg(args, "precoVenda"),
                buyPrice: reaisArg(args, "precoCusto") ?? 0,
                gtin: textArg(args, "codigoBarras"),
                categoryId: resolveByName("categoria", categories, textArg(args, "categoria"), warnings),
            }

            if (values.buyPrice === 0) warnings.push("Preço de custo não informado; ficou R$ 0,00.")

            if (values.name) {
                const db = getTenantDb(context.tenantSlug)
                const sameName = await db
                    .select({ id: product.id })
                    .from(product)
                    .where(and(isNull(product.deletedAt), sql`lower(${product.name}) = lower(${values.name})`))
                    .limit(1)

                if (sameName[0]) warnings.push(`Já existe um produto chamado "${values.name}".`)
            }

            return { values, warnings }
        },
        async fields(context) {
            const categories = await productCategoryOptions(context.tenantSlug)

            return [
                { key: "name", label: "Nome", kind: "text", required: true },
                { key: "sellPrice", label: "Preço de venda", kind: "money", required: true },
                { key: "buyPrice", label: "Preço de custo", kind: "money", required: true },
                { key: "gtin", label: "Código de barras", kind: "text" },
                { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
            ]
        },
        async check(values, context) {
            requiredText(values, "name", "o nome do produto")
            requiredMoney(values, "sellPrice", "o preço de venda")
            requiredMoney(values, "buyPrice", "o preço de custo", true)

            const categoryId = stringValue(values, "categoryId")
            if (categoryId) {
                const categories = await productCategoryOptions(context.tenantSlug)
                if (!categories.some((category) => String(category.id) === categoryId)) {
                    throw new AppError("categoria não encontrada", 400, "CATEGORY_NOT_FOUND")
                }
            }

            const gtin = stringValue(values, "gtin")
            if (gtin) {
                const db = getTenantDb(context.tenantSlug)
                const existing = await db
                    .select({ name: product.name })
                    .from(product)
                    .where(and(isNull(product.deletedAt), eq(product.gtin, gtin)))
                    .limit(1)

                if (existing[0]) {
                    throw new AppError(`já existe um produto com este código de barras: ${existing[0].name}`, 409, "PRODUCT_GTIN_TAKEN")
                }
            }
        },
        async execute(values, context) {
            const categoryId = stringValue(values, "categoryId")
            const created = await createProduct(context.tenantSlug, {
                name: stringValue(values, "name")!,
                sellPrice: numberValue(values, "sellPrice")!,
                buyPrice: numberValue(values, "buyPrice")!,
                gtin: stringValue(values, "gtin") ?? undefined,
                categoryId: categoryId ? Number(categoryId) : null,
                createdByUserId: context.userId,
            })

            return { referenceType: "product", referenceId: String(created.id) }
        },
    },
    {
        type: "sangria_suprimento",
        label: "Sangria ou suprimento de caixa",
        description: "Prepara uma sangria (retirada de dinheiro do caixa aberto) ou um suprimento (colocar dinheiro, ex.: troco). Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                tipo: { type: "string", enum: ["sangria", "suprimento"] },
                valor: { type: "number", description: "Valor em reais." },
                descricao: { type: "string", description: "Motivo, ex.: \"troco\", \"depósito no banco\"." },
            },
            required: ["tipo", "valor"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const cash = await openCash(context.tenantSlug)
            const type = enumArg(args, "tipo", { sangria: "drop", suprimento: "topup" } as Record<string, "drop" | "topup">)
            const values: ActionValues = {
                cashId: cash.id,
                type,
                amount: reaisArg(args, "valor"),
                expectedBalance: cash.amounts.expectedClosing,
                description: textArg(args, "descricao"),
            }

            const warnings: string[] = []
            if (type === "drop" && typeof values.amount === "number" && values.amount > cash.amounts.expectedClosing) {
                warnings.push("O valor da sangria é maior que o saldo esperado do caixa.")
            }

            return { values, warnings }
        },
        async fields() {
            return [
                {
                    key: "type",
                    label: "Tipo",
                    kind: "select",
                    required: true,
                    options: [{ value: "drop", label: "sangria (retirada)" }, { value: "topup", label: "suprimento (entrada)" }],
                },
                { key: "amount", label: "Valor", kind: "money", required: true },
                { key: "expectedBalance", label: "Saldo esperado do caixa", kind: "money", readOnly: true },
                { key: "description", label: "Descrição", kind: "text" },
            ]
        },
        async check(values, context) {
            const cash = await openCash(context.tenantSlug)
            if (cash.id !== values.cashId) {
                throw new AppError("o caixa foi fechado ou trocado; peça de novo ao assistente", 409, "CASH_CHANGED")
            }
            requiredMoney(values, "amount", "o valor")
        },
        async execute(values, context) {
            const type = stringValue(values, "type") as "drop" | "topup"
            const movement = await createCashMovement(context.tenantSlug, {
                cashId: stringValue(values, "cashId")!,
                nature: type === "topup" ? "in" : "out",
                type,
                amount: numberValue(values, "amount")!,
                description: stringValue(values, "description") ?? undefined,
                referenceType: "manual",
                userId: context.userId,
            })

            return { referenceType: "cash_movement", referenceId: movement.id }
        },
    },
    {
        type: "entrada_estoque",
        label: "Entrada de estoque",
        description: "Prepara a entrada de mercadoria no estoque (compra), com a opção de lançar a conta a pagar junto. Produto pelo id de consultar_estoque, código de barras ou nome. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                produtoId: { type: "integer", description: "id do produto, vindo de consultar_estoque." },
                produto: { type: "string", description: "Nome ou código de barras, se não tiver o id." },
                quantidade: { type: "integer", description: "Quantidade que entrou." },
                valorTotal: { type: "number", description: "Valor total da compra em reais, se informado. Se houver valor, prepara também a conta a pagar." },
                vencimento: { type: "string", description: "Vencimento da conta (AAAA-MM-DD). Padrão: hoje." },
                favorecido: { type: "string", description: "Fornecedor, se informado." },
                formaPagamento: paymentMethodArg,
                lancarConta: { type: "boolean", description: "Se deve lançar a conta a pagar. Padrão: verdadeiro quando há valor ou vencimento." },
            },
            required: ["quantidade"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const warnings: string[] = []
            const found = await findProduct(context.tenantSlug, args)
            const payees = await payeeOptions(context.tenantSlug)
            const quantity = intArg(args, "quantidade")
            const total = reaisArg(args, "valorTotal")
            const dueDate = dateArg(args, "vencimento")
            const createPayableArg = args.lancarConta
            const values: ActionValues = {
                productId: found.id,
                productName: found.name,
                quantity,
                createPayable: typeof createPayableArg === "boolean" ? createPayableArg : total !== null || dueDate !== null,
                amount: total ?? (quantity ? found.buyPrice * quantity : null),
                dueDate: dueDate ?? context.today,
                payeeId: resolveByName("favorecido", payees, textArg(args, "favorecido"), warnings),
                paymentMethod: enumArg(args, "formaPagamento", paymentMethodMapping),
            }

            if (total === null && values.createPayable) {
                warnings.push("Valor não informado; usei o preço de custo atual × quantidade.")
            }
            if (total !== null && quantity && Math.round(total / quantity) !== found.buyPrice) {
                warnings.push(`O custo unitário desta compra (${formatMoney(Math.round(total / quantity))}) é diferente do cadastrado (${formatMoney(found.buyPrice)}). O cadastro não é alterado.`)
            }

            return { values, warnings }
        },
        async fields(context) {
            const payees = await payeeOptions(context.tenantSlug)
            return [
                { key: "productName", label: "Produto", kind: "text", readOnly: true },
                { key: "quantity", label: "Quantidade", kind: "integer", required: true },
                { key: "createPayable", label: "Lançar conta a pagar", kind: "boolean" },
                { key: "amount", label: "Valor total", kind: "money" },
                { key: "dueDate", label: "Vencimento", kind: "date" },
                { key: "payeeId", label: "Fornecedor", kind: "select", options: toOptions(payees) },
                { key: "paymentMethod", label: "Forma de pagamento", kind: "select", options: paymentMethodOptions },
            ]
        },
        async check(values, context) {
            await loadProduct(context.tenantSlug, values.productId)

            const quantity = numberValue(values, "quantity")
            if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
                throw new AppError("informe uma quantidade válida", 400, "INVALID_QUANTITY")
            }

            if (values.createPayable === true) {
                const db = getTenantDb(context.tenantSlug)
                await preparePayableRows(db, {
                    description: "compra",
                    amount: requiredMoney(values, "amount", "o valor total"),
                    dueDate: stringValue(values, "dueDate") ?? "",
                    paymentMethod: stringValue(values, "paymentMethod") as PaymentMethod | null,
                    payeeId: stringValue(values, "payeeId"),
                    origin: "stock_purchase",
                    stockMovementId: "validacao",
                    userId: "",
                })
            }
        },
        async execute(values, context) {
            const result = await createStockPurchase(context.tenantSlug, {
                productId: Number(values.productId),
                quantity: numberValue(values, "quantity")!,
                createPayable: values.createPayable === true,
                amount: numberValue(values, "amount") ?? undefined,
                dueDate: stringValue(values, "dueDate") ?? undefined,
                payeeId: stringValue(values, "payeeId"),
                paymentMethod: stringValue(values, "paymentMethod") as PaymentMethod | null,
                userId: context.userId,
                timeZone: context.timeZone,
            })

            return { referenceType: "stock_movement", referenceId: result.movement.id }
        },
    },
    {
        type: "alterar_produto",
        label: "Alterar produto",
        description: "Prepara a alteração de um produto: preço de venda, preço de custo, nome, código de barras ou categoria. Produto pelo id de consultar_estoque, código de barras ou nome. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                produtoId: { type: "integer", description: "id do produto, vindo de consultar_estoque." },
                produto: { type: "string", description: "Nome ou código de barras, se não tiver o id." },
                novoNome: { type: "string" },
                precoVenda: { type: "number", description: "Novo preço de venda em reais." },
                precoCusto: { type: "number", description: "Novo preço de custo em reais." },
                codigoBarras: { type: "string" },
                categoria: { type: "string", description: "Nome da nova categoria." },
            },
            additionalProperties: false,
        },
        async propose(args, context) {
            const warnings: string[] = []
            const found = await findProduct(context.tenantSlug, args)
            const categories = await productCategoryOptions(context.tenantSlug)
            const categoryName = textArg(args, "categoria")

            const previousValues: ActionValues = {
                name: found.name,
                sellPrice: found.sellPrice,
                buyPrice: found.buyPrice,
                gtin: found.gtin,
                categoryId: found.categoryId === null ? null : String(found.categoryId),
            }
            const values: ActionValues = {
                productId: found.id,
                name: textArg(args, "novoNome") ?? found.name,
                sellPrice: reaisArg(args, "precoVenda") ?? found.sellPrice,
                buyPrice: reaisArg(args, "precoCusto") ?? found.buyPrice,
                gtin: textArg(args, "codigoBarras") ?? found.gtin,
                categoryId: categoryName
                    ? resolveByName("categoria", categories, categoryName, warnings)
                    : previousValues.categoryId,
            }

            if (Object.keys(previousValues).every((key) => previousValues[key] === values[key])) {
                throw new AppError("nenhuma alteração informada", 400, "INVALID_TOOL_ARGUMENT")
            }

            const sellPrice = values.sellPrice as number
            const buyPrice = values.buyPrice as number
            if (sellPrice > 0 && buyPrice >= sellPrice) {
                warnings.push("O preço de venda ficou menor ou igual ao custo.")
            }

            return { values, warnings, previousValues }
        },
        async fields(context) {
            const categories = await productCategoryOptions(context.tenantSlug)
            return [
                { key: "name", label: "Nome", kind: "text", required: true },
                { key: "sellPrice", label: "Preço de venda", kind: "money", required: true },
                { key: "buyPrice", label: "Preço de custo", kind: "money", required: true },
                { key: "gtin", label: "Código de barras", kind: "text" },
                { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
            ]
        },
        async check(values, context) {
            const found = await loadProduct(context.tenantSlug, values.productId)
            requiredText(values, "name", "o nome do produto")
            requiredMoney(values, "sellPrice", "o preço de venda")
            requiredMoney(values, "buyPrice", "o preço de custo", true)
            await assertUniqueGtin(context.tenantSlug, stringValue(values, "gtin"), found.id)
            await assertProductCategory(context.tenantSlug, stringValue(values, "categoryId"))
        },
        async execute(values, context) {
            const categoryId = stringValue(values, "categoryId")
            const updated = await updateProduct(context.tenantSlug, {
                productId: Number(values.productId),
                name: stringValue(values, "name")!,
                sellPrice: numberValue(values, "sellPrice")!,
                buyPrice: numberValue(values, "buyPrice")!,
                gtin: stringValue(values, "gtin"),
                categoryId: categoryId ? Number(categoryId) : null,
                userId: context.userId,
            })

            return { referenceType: "product", referenceId: String(updated.id) }
        },
    },
    {
        type: "editar_cliente",
        label: "Editar cliente",
        description: "Prepara a alteração do cadastro de um cliente (nome, documento, e-mail, telefone). Use o id retornado por buscar_clientes. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                clienteId: { type: "integer", description: "id do cliente, vindo de buscar_clientes." },
                nome: { type: "string" },
                documento: { type: "string" },
                email: { type: "string" },
                telefone: { type: "string" },
            },
            required: ["clienteId"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const found = await loadClient(context.tenantSlug, intArg(args, "clienteId"))
            const previousValues: ActionValues = {
                name: found.name,
                document: found.document,
                email: found.email,
                phone: found.phone,
            }
            const values: ActionValues = {
                clientId: found.id,
                name: textArg(args, "nome") ?? found.name,
                document: textArg(args, "documento") ?? found.document,
                email: textArg(args, "email") ?? found.email,
                phone: textArg(args, "telefone") ?? found.phone,
            }

            if (Object.keys(previousValues).every((key) => previousValues[key] === values[key])) {
                throw new AppError("nenhuma alteração informada", 400, "INVALID_TOOL_ARGUMENT")
            }

            return { values, warnings: [], previousValues }
        },
        async fields() {
            return [
                { key: "name", label: "Nome", kind: "text", required: true },
                { key: "document", label: "CPF/CNPJ", kind: "text" },
                { key: "email", label: "E-mail", kind: "text" },
                { key: "phone", label: "Telefone", kind: "text" },
            ]
        },
        async check(values, context) {
            const found = await loadClient(context.tenantSlug, values.clientId)
            await assertClientFields(context.tenantSlug, values, found.id)
        },
        async execute(values, context) {
            const updated = await editClient(context.tenantSlug, {
                clientId: Number(values.clientId),
                name: stringValue(values, "name")!,
                document: stringValue(values, "document") ?? undefined,
                email: stringValue(values, "email") ?? undefined,
                phone: stringValue(values, "phone") ?? undefined,
                userId: context.userId,
            })

            return { referenceType: "client", referenceId: String(updated.id) }
        },
    },
    {
        type: "estornar_baixa",
        label: "Estornar baixa de conta a pagar",
        description: "Prepara o estorno da baixa de uma conta a pagar já paga (ela volta a ficar pendente). Use o id retornado por contas_a_pagar. Não grava nada: o usuário confere e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                contaId: { type: "string", description: "id da conta, vindo de contas_a_pagar." },
            },
            required: ["contaId"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const found = await findPaidPayable(context.tenantSlug, textArg(args, "contaId"))
            return {
                values: {
                    payableId: found.id,
                    description: found.description,
                    amount: found.amount,
                    paidDate: found.paidDate,
                },
                warnings: [],
            }
        },
        async fields() {
            return [
                { key: "description", label: "Conta", kind: "text", readOnly: true },
                { key: "amount", label: "Valor", kind: "money", readOnly: true },
                { key: "paidDate", label: "Paga em", kind: "date", readOnly: true },
            ]
        },
        async check(values, context) {
            await findPaidPayable(context.tenantSlug, stringValue(values, "payableId"))
        },
        async execute(values, context) {
            const updated = await reversePayable(context.tenantSlug, {
                payableId: stringValue(values, "payableId")!,
                userId: context.userId,
            })

            return { referenceType: "payable", referenceId: updated.id }
        },
    },
    {
        type: "cadastrar_favorecido",
        label: "Cadastrar favorecido",
        description: "Prepara o cadastro de um favorecido de contas a pagar (fornecedor, funcionário…). Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                nome: { type: "string" },
                tipo: { type: "string", enum: ["fornecedor", "funcionario", "outros"], description: "Padrão: fornecedor." },
                documento: { type: "string", description: "CPF ou CNPJ." },
                telefone: { type: "string" },
                email: { type: "string" },
            },
            required: ["nome"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const values: ActionValues = {
                name: textArg(args, "nome"),
                kind: enumArg(args, "tipo", payeeKindMapping) ?? "supplier",
                document: textArg(args, "documento"),
                phone: textArg(args, "telefone"),
                email: textArg(args, "email"),
            }

            const warnings: string[] = []
            const payees = await payeeOptions(context.tenantSlug)
            if (values.name && payees.some((payee) => normalizeName(payee.name) === normalizeName(String(values.name)))) {
                warnings.push(`Já existe um favorecido chamado "${values.name}".`)
            }

            return { values, warnings }
        },
        async fields() {
            return [
                { key: "name", label: "Nome", kind: "text", required: true },
                {
                    key: "kind",
                    label: "Tipo",
                    kind: "select",
                    required: true,
                    options: payeeKinds.map((kind) => ({ value: kind, label: payeeKindLabels[kind] })),
                },
                { key: "document", label: "CPF/CNPJ", kind: "text" },
                { key: "phone", label: "Telefone", kind: "text" },
                { key: "email", label: "E-mail", kind: "text" },
            ]
        },
        async check(values) {
            requiredText(values, "name", "o nome do favorecido")
        },
        async execute(values, context) {
            const created = await createPayee(context.tenantSlug, {
                name: stringValue(values, "name")!,
                kind: stringValue(values, "kind") as PayeeKind,
                document: stringValue(values, "document"),
                phone: stringValue(values, "phone"),
                email: stringValue(values, "email"),
                userId: context.userId,
            })

            return { referenceType: "payee", referenceId: created.id }
        },
    },
    {
        type: "cadastrar_categoria_despesa",
        label: "Cadastrar categoria de despesa",
        description: "Prepara o cadastro de uma categoria de despesa para contas a pagar. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                nome: { type: "string" },
            },
            required: ["nome"],
            additionalProperties: false,
        },
        async propose(args) {
            return { values: { name: textArg(args, "nome") }, warnings: [] }
        },
        async fields() {
            return [{ key: "name", label: "Nome", kind: "text", required: true }]
        },
        async check(values, context) {
            const name = requiredText(values, "name", "o nome da categoria")
            const categories = await expenseCategoryOptions(context.tenantSlug)
            if (categories.some((category) => normalizeName(category.name) === normalizeName(name))) {
                throw new AppError(`já existe a categoria "${name}"`, 409, "CATEGORY_ALREADY_EXISTS")
            }
        },
        async execute(values, context) {
            const created = await createExpenseCategory(context.tenantSlug, {
                name: stringValue(values, "name")!,
                userId: context.userId,
            })

            return { referenceType: "expense_category", referenceId: created.id }
        },
    },
    {
        type: "alterar_precos_em_lote",
        label: "Alterar preços em lote",
        description: "Prepara a alteração de preço de vários produtos de uma vez: percentual (ex.: +5%), preço fixo ou arredondamento para uma terminação (ex.: ,90). Produtos por categoria, por trecho do nome ou por ids. Não grava nada: o usuário confere linha a linha, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                categoria: { type: "string", description: "Nome da categoria dos produtos." },
                busca: { type: "string", description: "Trecho do nome dos produtos." },
                produtoIds: { type: "array", items: { type: "integer" }, description: "ids vindos de consultar_estoque." },
                todos: { type: "boolean", description: "Todos os produtos. Só use se o usuário pedir explicitamente." },
                campo: { type: "string", enum: ["venda", "custo"], description: "Qual preço alterar. Padrão: venda." },
                percentual: { type: "number", description: "Variação percentual, ex.: 5 para +5%, -10 para -10%." },
                novoPreco: { type: "number", description: "Preço fixo em reais para todos os produtos selecionados." },
                terminacao: { type: "integer", description: "Centavos finais desejados (0 a 99), ex.: 90 para arredondar para cima até ,90." },
            },
            additionalProperties: false,
        },
        async propose(args, context) {
            const field = enumArg(args, "campo", { venda: "sellPrice", custo: "buyPrice" } as Record<string, "sellPrice" | "buyPrice">) ?? "sellPrice"
            const percent = args.percentual === undefined || args.percentual === null ? null : Number(args.percentual)
            const fixed = reaisArg(args, "novoPreco")
            const ending = intArg(args, "terminacao")

            if (percent !== null && !Number.isFinite(percent)) throw new AppError("percentual inválido", 400, "INVALID_TOOL_ARGUMENT")
            if (ending !== null && (ending < 0 || ending > 99)) throw new AppError("terminacao deve estar entre 0 e 99", 400, "INVALID_TOOL_ARGUMENT")
            if (percent === null && fixed === null && ending === null) {
                throw new AppError("informe percentual, novoPreco ou terminacao", 400, "INVALID_TOOL_ARGUMENT")
            }

            let rows = await productRows(context.tenantSlug)
            const categoryName = textArg(args, "categoria")
            const search = textArg(args, "busca")
            const ids = Array.isArray(args.produtoIds) ? args.produtoIds.map(Number) : null

            if (categoryName) {
                const warnings: string[] = []
                const categoryId = resolveByName("categoria", await productCategoryOptions(context.tenantSlug), categoryName, warnings)
                if (!categoryId) throw new AppError(`não encontrei a categoria "${categoryName}"`, 404, "CATEGORY_NOT_FOUND")
                rows = rows.filter((row) => String(row.categoryId) === categoryId)
            }
            if (search) rows = rows.filter((row) => normalizeName(row.name).includes(normalizeName(search)))
            if (ids) rows = rows.filter((row) => ids.includes(row.id))
            if (!categoryName && !search && !ids && args.todos !== true) {
                throw new AppError("informe categoria, busca ou produtoIds (ou todos, se o usuário pediu)", 400, "INVALID_TOOL_ARGUMENT")
            }
            if (rows.length === 0) throw new AppError("nenhum produto encontrado com esse filtro", 404, "PRODUCT_NOT_FOUND")
            if (rows.length > MAX_BATCH_ROWS) {
                throw new AppError(`${rows.length} produtos encontrados; o máximo é ${MAX_BATCH_ROWS}. Refine o filtro.`, 400, "INVALID_TOOL_ARGUMENT")
            }

            const batchRows: ActionRowValues[] = rows
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((row) => {
                    let price = fixed ?? row[field]
                    if (percent !== null) price = Math.round(price * (1 + percent / 100))
                    if (ending !== null) price = withEnding(price, ending)

                    return {
                        include: true,
                        productId: row.id,
                        name: row.name,
                        currentPrice: row[field],
                        newPrice: price,
                        buyPrice: row.buyPrice,
                    }
                })

            const warnings: string[] = []
            if (field === "sellPrice") {
                const losing = batchRows.filter((row) => (row.newPrice as number) <= (row.buyPrice as number))
                if (losing.length) {
                    warnings.push(`Preço de venda menor ou igual ao custo em: ${losing.map((row) => row.name).join(", ")}.`)
                }
            }

            return { values: { field, rows: batchRows }, warnings }
        },
        async fields() {
            return [
                {
                    key: "field",
                    label: "Preço alterado",
                    kind: "select",
                    readOnly: true,
                    options: [{ value: "sellPrice", label: "venda" }, { value: "buyPrice", label: "custo" }],
                },
                {
                    key: "rows",
                    label: "Produtos",
                    kind: "rows",
                    columns: [
                        includeColumn,
                        { key: "name", label: "Produto", kind: "text", readOnly: true },
                        { key: "currentPrice", label: "Atual", kind: "money", readOnly: true },
                        { key: "newPrice", label: "Novo", kind: "money", required: true },
                    ],
                },
            ]
        },
        async check(values, context) {
            const products = await productRows(context.tenantSlug)
            await checkEachRow(values, (row) => {
                if (!products.some((item) => item.id === row.productId)) {
                    throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")
                }
                if (typeof row.newPrice !== "number" || !Number.isInteger(row.newPrice) || row.newPrice <= 0) {
                    throw new AppError("informe um preço válido", 400, "INVALID_ACTION_VALUE")
                }
            })
        },
        async execute(values, context) {
            const field = values.field === "buyPrice" ? "buyPrice" : "sellPrice"
            const updated = await updateProductPrices(context.tenantSlug, {
                prices: includedRows(values).map((row) => ({ productId: Number(row.productId), [field]: Number(row.newPrice) })),
                userId: context.userId,
            })

            return { referenceType: "product", referenceId: JSON.stringify(updated.map((row) => String(row.id))) }
        },
    },
    {
        type: "cadastrar_produtos_em_lote",
        label: "Cadastrar produtos em lote",
        description: "Prepara o cadastro de vários produtos de uma vez, por exemplo a partir de uma lista colada pelo usuário. Não grava nada: o usuário confere linha a linha, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                produtos: {
                    type: "array",
                    maxItems: MAX_BATCH_ROWS,
                    items: {
                        type: "object",
                        properties: {
                            nome: { type: "string" },
                            precoVenda: { type: "number", description: "Em reais." },
                            precoCusto: { type: "number", description: "Em reais, se informado." },
                            codigoBarras: { type: "string" },
                            categoria: { type: "string" },
                        },
                        required: ["nome", "precoVenda"],
                        additionalProperties: false,
                    },
                },
            },
            required: ["produtos"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const items = arrayArg(args, "produtos")
            const [existing, categories] = await Promise.all([
                productRows(context.tenantSlug),
                productCategoryOptions(context.tenantSlug),
            ])
            const existingNames = new Set(existing.map((row) => normalizeName(row.name)))
            const existingGtins = new Set(existing.map((row) => row.gtin).filter(Boolean))
            const seenGtins = new Set<string>()
            const warnings: string[] = []
            const duplicated: string[] = []

            const rows: ActionRowValues[] = items.map((item, index) => {
                const name = textArg(item, "nome")
                const gtin = textArg(item, "codigoBarras")
                const isDuplicate = (name !== null && existingNames.has(normalizeName(name)))
                    || (gtin !== null && (existingGtins.has(gtin) || seenGtins.has(gtin)))
                if (gtin) seenGtins.add(gtin)
                if (isDuplicate) duplicated.push(`${index + 1} (${name})`)

                return {
                    include: !isDuplicate,
                    name,
                    sellPrice: reaisArg(item, "precoVenda"),
                    buyPrice: reaisArg(item, "precoCusto") ?? 0,
                    gtin,
                    categoryId: resolveByName("categoria", categories, textArg(item, "categoria"), warnings),
                }
            })

            if (duplicated.length) {
                warnings.unshift(`Já cadastrados (desmarcados): linhas ${duplicated.join(", ")}.`)
            }
            if (rows.some((row) => row.include && row.buyPrice === 0)) {
                warnings.push("Produtos sem preço de custo ficaram com R$ 0,00.")
            }

            return { values: { rows }, warnings: [...new Set(warnings)] }
        },
        async fields(context) {
            const categories = await productCategoryOptions(context.tenantSlug)
            return [{
                key: "rows",
                label: "Produtos",
                kind: "rows",
                columns: [
                    includeColumn,
                    { key: "name", label: "Nome", kind: "text", required: true },
                    { key: "sellPrice", label: "Venda", kind: "money", required: true },
                    { key: "buyPrice", label: "Custo", kind: "money", required: true },
                    { key: "gtin", label: "Código de barras", kind: "text" },
                    { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
                ],
            }]
        },
        async check(values, context) {
            const gtins = new Set<string>()
            await checkEachRow(values, async (row) => {
                requiredText(row, "name", "o nome do produto")
                requiredMoney(row, "sellPrice", "o preço de venda")
                requiredMoney(row, "buyPrice", "o preço de custo", true)
                await assertProductCategory(context.tenantSlug, stringValue(row, "categoryId"))

                const gtin = stringValue(row, "gtin")
                if (gtin && gtins.has(gtin)) throw new AppError("código de barras repetido na lista", 400, "PRODUCT_GTIN_TAKEN")
                if (gtin) gtins.add(gtin)
                await assertUniqueGtin(context.tenantSlug, gtin)
            })
        },
        async execute(values, context) {
            const created = await createProducts(context.tenantSlug, {
                products: includedRows(values).map((row) => {
                    const categoryId = stringValue(row, "categoryId")
                    return {
                        name: stringValue(row, "name")!,
                        sellPrice: numberValue(row, "sellPrice")!,
                        buyPrice: numberValue(row, "buyPrice")!,
                        gtin: stringValue(row, "gtin"),
                        categoryId: categoryId ? Number(categoryId) : null,
                    }
                }),
                userId: context.userId,
            })

            return { referenceType: "product", referenceId: JSON.stringify(created.map((row) => String(row.id))) }
        },
    },
    {
        type: "lancar_contas_em_lote",
        label: "Lançar contas a pagar em lote",
        description: "Prepara o lançamento de várias contas a pagar de uma vez (ex.: aluguel, internet e contador). Para uma conta só, use lancar_conta_a_pagar. Não grava nada: o usuário confere linha a linha, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                contas: {
                    type: "array",
                    maxItems: MAX_BATCH_ROWS,
                    items: {
                        type: "object",
                        properties: {
                            descricao: { type: "string" },
                            valor: { type: "number", description: "Em reais." },
                            vencimento: { type: "string", description: "AAAA-MM-DD." },
                            favorecido: { type: "string" },
                            categoria: { type: "string" },
                            formaPagamento: paymentMethodArg,
                        },
                        required: ["descricao", "valor", "vencimento"],
                        additionalProperties: false,
                    },
                },
            },
            required: ["contas"],
            additionalProperties: false,
        },
        async propose(args, context) {
            const items = arrayArg(args, "contas")
            const [payees, categories] = await Promise.all([
                payeeOptions(context.tenantSlug),
                expenseCategoryOptions(context.tenantSlug),
            ])
            const warnings: string[] = []

            const rows: ActionRowValues[] = items.map((item) => ({
                include: true,
                description: textArg(item, "descricao"),
                amount: reaisArg(item, "valor"),
                dueDate: dateArg(item, "vencimento"),
                payeeId: resolveByName("favorecido", payees, textArg(item, "favorecido"), warnings),
                categoryId: resolveByName("categoria", categories, textArg(item, "categoria"), warnings),
                paymentMethod: enumArg(item, "formaPagamento", paymentMethodMapping),
            }))

            return { values: { rows }, warnings: [...new Set(warnings)] }
        },
        async fields(context) {
            const [payees, categories] = await Promise.all([
                payeeOptions(context.tenantSlug),
                expenseCategoryOptions(context.tenantSlug),
            ])
            return [{
                key: "rows",
                label: "Contas",
                kind: "rows",
                columns: [
                    includeColumn,
                    { key: "description", label: "Descrição", kind: "text", required: true },
                    { key: "amount", label: "Valor", kind: "money", required: true },
                    { key: "dueDate", label: "Vencimento", kind: "date", required: true },
                    { key: "payeeId", label: "Favorecido", kind: "select", options: toOptions(payees) },
                    { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
                    { key: "paymentMethod", label: "Forma", kind: "select", options: paymentMethodOptions },
                ],
            }]
        },
        async check(values, context) {
            const db = getTenantDb(context.tenantSlug)
            await checkEachRow(values, async (row) => {
                await preparePayableRows(db, payableInput(row, ""))
            })
        },
        async execute(values, context) {
            const created = await createPayables(context.tenantSlug, includedRows(values).map((row) => payableInput(row, context.userId)))
            return { referenceType: "payable", referenceId: JSON.stringify(created.map((row) => row.id)) }
        },
    },
    {
        type: "importar_nfe",
        label: "Importar NF-e de compra",
        description: "Prepara a entrada no estoque de uma NF-e de compra anexada pelo usuário (XML): casa itens com produtos pelo código de barras ou nome, oferece cadastrar os que faltam e lança as contas a pagar pelas duplicatas. Não grava nada: o usuário confere, pode editar e confirma num cartão.",
        parameters: {
            type: "object",
            properties: {
                anexoId: { type: "string", description: "anexoId informado na mensagem do usuário." },
            },
            required: ["anexoId"],
            additionalProperties: false,
        },
        // Produtos novos chegam sem preço de venda; o usuário completa no cartão
        checkOnPropose: false,
        async propose(args, context) {
            const anexoId = textArg(args, "anexoId")
            if (!anexoId || !context.userId) throw new AppError("informe o anexoId", 400, "INVALID_TOOL_ARGUMENT")

            const attachment = await findOwnAttachment(context.tenantSlug, anexoId, context.userId)
            const nfe = parseNfe(await readAttachmentText(context.tenantSlug, attachment))
            await assertNfeNotImported(context.tenantSlug, nfe.accessKey)

            const [products, payees] = await Promise.all([
                productRows(context.tenantSlug),
                getPayees(context.tenantSlug),
            ])
            const warnings: string[] = []

            const supplierPayee = nfe.supplier.document
                ? payees.find((row) => row.document?.replace(/\D/g, "") === nfe.supplier.document)
                : undefined
            if (!supplierPayee) {
                warnings.push(`O fornecedor "${nfe.supplier.name}" não está cadastrado e será criado ao confirmar.`)
            }

            const unmatched: string[] = []
            const odd: string[] = []
            const rows: ActionRowValues[] = nfe.items.map((item) => {
                const match = (item.ean ? products.find((row) => row.gtin === item.ean) : undefined)
                    ?? products.find((row) => normalizeName(row.name) === normalizeName(item.description))
                if (!match) unmatched.push(item.description)

                const quantity = Math.round(item.quantity)
                if (quantity !== item.quantity || (item.unit && item.unit !== "UN")) {
                    odd.push(`${item.description} (${item.quantity} ${item.unit})`)
                }

                return {
                    include: true,
                    description: item.description,
                    ean: item.ean,
                    productId: match ? String(match.id) : NEW_PRODUCT,
                    quantity: Math.max(quantity, 1),
                    unitCost: Math.round(item.total / Math.max(item.quantity, 1)),
                    sellPrice: null,
                }
            })

            if (unmatched.length) {
                warnings.push(`${unmatched.length} item(ns) sem produto correspondente serão cadastrados como novos; informe o preço de venda: ${unmatched.join(", ")}.`)
            }
            if (odd.length) {
                warnings.push(`Confira a quantidade em unidades destes itens: ${odd.join(", ")}.`)
            }

            const installments: ActionRowValues[] = nfe.installments.length
                ? nfe.installments.map((installment) => ({ include: true, dueDate: installment.dueDate, amount: installment.amount }))
                : [{ include: true, dueDate: context.today, amount: nfe.total }]
            if (!nfe.installments.length) {
                warnings.push("A nota não tem duplicatas; preparei uma conta com vencimento hoje pelo valor total.")
            }

            const installmentsTotal = installments.reduce((sum, row) => sum + Number(row.amount), 0)
            if (installmentsTotal !== nfe.total) {
                warnings.push(`A soma das duplicatas (${formatMoney(installmentsTotal)}) é diferente do total da nota (${formatMoney(nfe.total)}).`)
            }

            return {
                values: {
                    accessKey: nfe.accessKey,
                    number: nfe.number,
                    supplierName: nfe.supplier.name,
                    supplierDocument: nfe.supplier.document,
                    issuedAt: nfe.issuedAt,
                    total: nfe.total,
                    payeeId: supplierPayee?.id ?? null,
                    newPayeeName: supplierPayee ? null : nfe.supplier.name,
                    offerNewPayee: !supplierPayee,
                    updateCosts: true,
                    createPayables: true,
                    categoryId: null,
                    paymentMethod: null,
                    rows,
                    installments,
                },
                warnings,
            }
        },
        async fields(context, values) {
            const [products, payees, categories] = await Promise.all([
                productRows(context.tenantSlug),
                payeeOptions(context.tenantSlug),
                expenseCategoryOptions(context.tenantSlug),
            ])

            return [
                { key: "number", label: "Nota", kind: "text", readOnly: true },
                { key: "issuedAt", label: "Emissão", kind: "date", readOnly: true },
                { key: "supplierName", label: "Fornecedor na nota", kind: "text", readOnly: true },
                { key: "total", label: "Total da nota", kind: "money", readOnly: true },
                { key: "payeeId", label: "Favorecido", kind: "select", options: toOptions(payees) },
                ...(values.offerNewPayee === true
                    ? [{ key: "newPayeeName", label: "Novo favorecido", kind: "text" as const }]
                    : []),
                { key: "updateCosts", label: "Atualizar o custo dos produtos", kind: "boolean" },
                {
                    key: "rows",
                    label: "Itens",
                    kind: "rows",
                    columns: [
                        includeColumn,
                        { key: "description", label: "Item na nota", kind: "text", readOnly: true },
                        { key: "ean", label: "EAN", kind: "text", readOnly: true },
                        {
                            key: "productId",
                            label: "Produto",
                            kind: "select",
                            required: true,
                            options: [
                                { value: NEW_PRODUCT, label: "cadastrar novo" },
                                ...products.map((row) => ({ value: String(row.id), label: row.name })),
                            ],
                        },
                        { key: "quantity", label: "Qtd.", kind: "integer", required: true },
                        { key: "unitCost", label: "Custo unit.", kind: "money", required: true },
                        { key: "sellPrice", label: "Venda (novos)", kind: "money" },
                    ],
                },
                { key: "createPayables", label: "Lançar contas a pagar", kind: "boolean" },
                { key: "categoryId", label: "Categoria", kind: "select", options: toOptions(categories) },
                { key: "paymentMethod", label: "Forma de pagamento", kind: "select", options: paymentMethodOptions },
                {
                    key: "installments",
                    label: "Parcelas",
                    kind: "rows",
                    columns: [
                        includeColumn,
                        { key: "dueDate", label: "Vencimento", kind: "date", required: true },
                        { key: "amount", label: "Valor", kind: "money", required: true },
                    ],
                },
            ]
        },
        async check(values, context) {
            await assertNfeNotImported(context.tenantSlug, String(values.accessKey))
            const products = await productRows(context.tenantSlug)

            if (!stringValue(values, "payeeId") && !stringValue(values, "newPayeeName") && values.createPayables === true) {
                throw new AppError("escolha o favorecido ou informe o novo favorecido", 400, "INVALID_ACTION_VALUE")
            }

            await checkEachRow(values, (row) => {
                const productId = stringValue(row, "productId")
                if (productId === NEW_PRODUCT) {
                    requiredMoney(row, "sellPrice", "o preço de venda do produto novo")
                } else if (!products.some((item) => String(item.id) === productId)) {
                    throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")
                }

                const quantity = numberValue(row, "quantity")
                if (quantity === null || !Number.isInteger(quantity) || quantity <= 0) {
                    throw new AppError("informe uma quantidade válida", 400, "INVALID_QUANTITY")
                }
                requiredMoney(row, "unitCost", "o custo unitário", true)
            })

            const gtins = includedRows(values)
                .filter((row) => row.productId === NEW_PRODUCT)
                .map((row) => stringValue(row, "ean"))
                .filter((gtin): gtin is string => Boolean(gtin))
            for (const gtin of gtins) await assertUniqueGtin(context.tenantSlug, gtin)

            if (values.createPayables === true) {
                await checkEachRow(values, (row) => {
                    const dueDate = stringValue(row, "dueDate")
                    if (!dueDate || !isValidDateInput(dueDate)) {
                        throw new AppError("informe um vencimento válido", 400, "INVALID_ACTION_VALUE")
                    }
                    requiredMoney(row, "amount", "o valor")
                }, "installments")
            }
        },
        async execute(values, context) {
            const number = stringValue(values, "number") ?? ""
            const supplierName = stringValue(values, "supplierName") ?? ""
            const newPayeeName = stringValue(values, "newPayeeName")
            const payeeId = stringValue(values, "payeeId")
            const installments = values.createPayables === true ? includedRows(values, "installments") : []

            const result = await createStockPurchaseBatch(context.tenantSlug, {
                payeeId,
                newPayee: !payeeId && newPayeeName
                    ? { name: newPayeeName, document: stringValue(values, "supplierDocument") }
                    : null,
                items: includedRows(values).map((row) => {
                    const productId = stringValue(row, "productId")
                    return {
                        productId: productId === NEW_PRODUCT ? null : Number(productId),
                        newProduct: productId === NEW_PRODUCT
                            ? { name: stringValue(row, "description")!, gtin: stringValue(row, "ean"), sellPrice: numberValue(row, "sellPrice")! }
                            : null,
                        quantity: numberValue(row, "quantity")!,
                        unitCost: numberValue(row, "unitCost")!,
                    }
                }),
                updateCosts: values.updateCosts === true,
                reason: `NF-e ${number}`,
                payables: installments.map((row, index) => ({
                    description: installments.length > 1
                        ? `NF-e ${number} - ${supplierName} (${index + 1}/${installments.length})`
                        : `NF-e ${number} - ${supplierName}`,
                    amount: numberValue(row, "amount")!,
                    dueDate: stringValue(row, "dueDate")!,
                })),
                paymentMethod: stringValue(values, "paymentMethod") as PaymentMethod | null,
                categoryId: stringValue(values, "categoryId"),
                notes: `NF-e nº ${number}, chave ${values.accessKey}`,
                userId: context.userId,
            })

            return { referenceType: "stock_movement", referenceId: JSON.stringify(result.movements.map((row) => row.id)) }
        },
    },
]

const definitionsByType = new Map(actionDefinitions.map((definition) => [definition.type, definition]))

export function getActionDefinition(type: string) {
    return definitionsByType.get(type)
}

export function actionToolDefinitions() {
    return actionDefinitions.map((definition) => ({
        type: "function" as const,
        function: {
            name: definition.type,
            description: definition.description,
            parameters: definition.parameters,
        },
    }))
}

export async function proposeAction(type: string, args: Record<string, unknown>, context: ActionContext) {
    const definition = getActionDefinition(type)
    if (!definition) throw new AppError(`ação desconhecida: ${type}`, 400, "UNKNOWN_ACTION")

    const proposal = await definition.propose(args, context)
    if (definition.checkOnPropose !== false) await definition.check(proposal.values, context)

    return proposal
}

function coerceFieldValue(field: ActionField, raw: unknown): ActionScalar {
    if (raw === null || raw === "") {
        if (field.required) throw new AppError(`informe ${field.label.toLowerCase()}`, 400, "INVALID_ACTION_VALUE")
        return null
    }

    if (field.kind === "boolean") {
        if (typeof raw !== "boolean") throw new AppError(`${field.label} inválido`, 400, "INVALID_ACTION_VALUE")
        return raw
    }

    if (field.kind === "money" || field.kind === "integer") {
        if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
            throw new AppError(`${field.label} inválido`, 400, "INVALID_ACTION_VALUE")
        }
        return raw
    }

    if (typeof raw !== "string") {
        throw new AppError(`${field.label} inválido`, 400, "INVALID_ACTION_VALUE")
    }

    if (field.kind === "date" && !isValidDateInput(raw)) {
        throw new AppError(`${field.label} deve ser uma data válida`, 400, "INVALID_ACTION_VALUE")
    }

    if (field.kind === "select" && !field.options?.some((option) => option.value === raw)) {
        throw new AppError(`${field.label}: opção inválida`, 400, "INVALID_ACTION_VALUE")
    }

    return raw.trim()
}

function mergeEditedRows(field: ActionField, stored: ActionValue, raw: unknown) {
    const rows = Array.isArray(stored) ? stored : []
    if (!Array.isArray(raw) || raw.length !== rows.length) {
        throw new AppError(`${field.label}: linhas inválidas`, 400, "INVALID_ACTION_VALUE")
    }

    return rows.map((row, index) => {
        const edited = raw[index]
        if (!edited || typeof edited !== "object") return row

        const merged = { ...row }
        for (const column of field.columns ?? []) {
            if (column.readOnly || !(column.key in edited)) continue
            try {
                merged[column.key] = coerceFieldValue(column, (edited as Record<string, unknown>)[column.key])
            } catch (error) {
                if (error instanceof AppError) throw new AppError(`linha ${index + 1}: ${error.message}`, error.statusCode, error.code)
                throw error
            }
        }

        return merged
    })
}

// Junta os valores editados no cartão aos guardados, aceitando só campos
// editáveis e do tipo certo
export function mergeEditedValues(fields: ActionField[], stored: ActionValues, edited: Record<string, unknown> = {}) {
    const values = { ...stored }

    for (const field of fields) {
        if (field.readOnly || !(field.key in edited)) continue

        values[field.key] = field.kind === "rows"
            ? mergeEditedRows(field, stored[field.key], edited[field.key])
            : coerceFieldValue(field, edited[field.key])
    }

    return values
}

function formatMoney(cents: number) {
    return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Versão legível dos valores, para o modelo descrever a ação ao usuário
function describeScalar(field: ActionField, value: ActionScalar) {
    if (field.kind === "boolean") return value ? "sim" : "não"
    if (field.kind === "money" && typeof value === "number") return formatMoney(value)
    if (field.kind === "select") return field.options?.find((option) => option.value === String(value))?.label ?? String(value)
    return String(value)
}

export function describeValues(fields: ActionField[], values: ActionValues) {
    const described: Record<string, string> = {}

    for (const field of fields) {
        const value = values[field.key]
        if (value === null || value === undefined || value === "") continue

        if (Array.isArray(value)) {
            const included = value.filter((row) => row.include !== false)
            const columns = (field.columns ?? []).filter((column) => column.kind !== "boolean")
            described[field.label] = `${included.length} de ${value.length} linhas marcadas: ` + included
                .map((row) => columns
                    .filter((column) => row[column.key] !== null && row[column.key] !== "")
                    .map((column) => describeScalar(column, row[column.key]))
                    .join(" · "))
                .join("; ")
        } else if (field.kind === "boolean") {
            described[field.label] = value ? "sim" : "não"
        } else if (field.kind === "money" && typeof value === "number") {
            described[field.label] = formatMoney(value)
        } else if (field.kind === "select") {
            described[field.label] = field.options?.find((option) => option.value === String(value))?.label ?? String(value)
        } else {
            described[field.label] = String(value)
        }
    }

    return described
}
