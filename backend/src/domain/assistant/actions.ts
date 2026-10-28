import { and, eq, isNull, sql } from "drizzle-orm"
import { getTenantDb } from "@/db/db"
import { client, product } from "@/db/schema/tenant"
import { createClient } from "../tenant/client/ClientService"
import { createProduct } from "../tenant/products/ProductsService"
import { getCategories } from "../tenant/category/CategoryService"
import { getBankAccounts } from "../tenant/payables/BankAccountsService"
import { getExpenseCategories } from "../tenant/payables/ExpenseCategoriesService"
import { getPayees } from "../tenant/payables/PayeesService"
import {
    createPayable,
    installmentModes,
    paymentMethods,
    payPayable,
    preparePayableRows,
    type CreatePayableInput,
    type InstallmentMode,
    type PaymentMethod,
} from "../tenant/payables/PayablesService"
import { AppError } from "../../utils/errors"
import { isValidDateInput } from "../../utils/dates"

// Valores editáveis no cartão: dinheiro em centavos, datas AAAA-MM-DD e
// seleções pelo id em texto
export type ActionValue = string | number | null
export type ActionValues = Record<string, ActionValue>

export type ActionField = {
    key: string
    label: string
    kind: "text" | "textarea" | "money" | "date" | "integer" | "select"
    required?: boolean
    readOnly?: boolean
    options?: { value: string, label: string }[]
}

export type ActionContext = {
    tenantSlug: string
    timeZone: string
    today: string
}

export type ActionProposal = {
    values: ActionValues
    warnings: string[]
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
    fields: (context: ActionContext) => Promise<ActionField[]>
    // Lança AppError se os valores não puderem ser executados
    check: (values: ActionValues, context: ActionContext) => Promise<void>
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
function resolveByName(
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

            const values: ActionValues = {
                description: textArg(args, "descricao"),
                amount: reaisArg(args, "valor"),
                dueDate: dateArg(args, "vencimento"),
                payeeId: resolveByName("favorecido", payees, textArg(args, "favorecido"), warnings),
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
        async fields(context) {
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
            const { payables, groupId } = await createPayable(context.tenantSlug, payableInput(values, context.userId))
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
    await definition.check(proposal.values, context)

    return proposal
}

// Junta os valores editados no cartão aos guardados, aceitando só campos
// editáveis e do tipo certo
export function mergeEditedValues(fields: ActionField[], stored: ActionValues, edited: Record<string, unknown> = {}) {
    const values = { ...stored }

    for (const field of fields) {
        if (field.readOnly || !(field.key in edited)) continue

        const raw = edited[field.key]
        if (raw === null || raw === "") {
            if (field.required) throw new AppError(`informe ${field.label.toLowerCase()}`, 400, "INVALID_ACTION_VALUE")
            values[field.key] = null
            continue
        }

        if (field.kind === "money" || field.kind === "integer") {
            if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
                throw new AppError(`${field.label} inválido`, 400, "INVALID_ACTION_VALUE")
            }
            values[field.key] = raw
            continue
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

        values[field.key] = raw.trim()
    }

    return values
}

function formatMoney(cents: number) {
    return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Versão legível dos valores, para o modelo descrever a ação ao usuário
export function describeValues(fields: ActionField[], values: ActionValues) {
    const described: Record<string, string> = {}

    for (const field of fields) {
        const value = values[field.key]
        if (value === null || value === undefined || value === "") continue

        if (field.kind === "money" && typeof value === "number") {
            described[field.label] = formatMoney(value)
        } else if (field.kind === "select") {
            described[field.label] = field.options?.find((option) => option.value === String(value))?.label ?? String(value)
        } else {
            described[field.label] = String(value)
        }
    }

    return described
}
