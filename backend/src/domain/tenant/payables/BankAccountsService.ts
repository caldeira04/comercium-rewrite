import { getTenantDb } from "@/db/db"
import { bankAccount } from "@/db/schema/tenant"
import { and, asc, eq, isNull } from "drizzle-orm"
import { AppError } from "../../../utils/errors"

export const bankAccountKinds = ["cash", "checking", "savings", "other"] as const
export type BankAccountKind = (typeof bankAccountKinds)[number]

function normalizeName(name?: string) {
    const value = name?.trim()

    if (!value) {
        throw new AppError("informe o nome da conta", 400, "INVALID_BANK_ACCOUNT_NAME")
    }

    return value
}

function normalizeKind(kind?: string | null) {
    if (!kind) return "checking" as BankAccountKind

    if (!bankAccountKinds.includes(kind as BankAccountKind)) {
        throw new AppError("tipo de conta inválido", 400, "INVALID_BANK_ACCOUNT_KIND")
    }

    return kind as BankAccountKind
}

function optionalText(value?: string | null) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
}

export async function getBankAccounts(tenantSlug: string, options: { includeDeleted?: boolean } = {}) {
    const db = getTenantDb(tenantSlug)

    return await db
        .select({
            id: bankAccount.id,
            name: bankAccount.name,
            kind: bankAccount.kind,
            bankName: bankAccount.bankName,
            agency: bankAccount.agency,
            accountNumber: bankAccount.accountNumber,
            isActive: bankAccount.isActive,
            deletedAt: bankAccount.deletedAt,
        })
        .from(bankAccount)
        .where(options.includeDeleted ? undefined : isNull(bankAccount.deletedAt))
        .orderBy(asc(bankAccount.name))
}

export async function createBankAccount(tenantSlug: string, data: {
    name: string
    kind?: BankAccountKind
    bankName?: string | null
    agency?: string | null
    accountNumber?: string | null
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const [created] = await db.insert(bankAccount).values({
        name: normalizeName(data.name),
        kind: normalizeKind(data.kind),
        bankName: optionalText(data.bankName),
        agency: optionalText(data.agency),
        accountNumber: optionalText(data.accountNumber),
        createdByUserId: data.userId,
        updatedByUserId: data.userId,
    }).returning()

    return created
}

export async function updateBankAccount(tenantSlug: string, data: {
    bankAccountId: string
    userId: string
    name?: string
    kind?: BankAccountKind
    bankName?: string | null
    agency?: string | null
    accountNumber?: string | null
    isActive?: boolean
}) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.bankAccount.findFirst({
        where: (bankAccount, { and, eq, isNull }) =>
            and(eq(bankAccount.id, data.bankAccountId), isNull(bankAccount.deletedAt)),
    })

    if (!existing) {
        throw new AppError("conta bancária não encontrada", 404, "BANK_ACCOUNT_NOT_FOUND")
    }

    const [updated] = await db.update(bankAccount).set({
        name: data.name === undefined ? existing.name : normalizeName(data.name),
        kind: data.kind === undefined ? existing.kind : normalizeKind(data.kind),
        bankName: data.bankName === undefined ? existing.bankName : optionalText(data.bankName),
        agency: data.agency === undefined ? existing.agency : optionalText(data.agency),
        accountNumber: data.accountNumber === undefined ? existing.accountNumber : optionalText(data.accountNumber),
        isActive: data.isActive === undefined ? existing.isActive : (data.isActive ? 1 : 0),
        updatedByUserId: data.userId,
    }).where(eq(bankAccount.id, data.bankAccountId)).returning()

    return updated
}

export async function deleteBankAccount(tenantSlug: string, bankAccountId: string, userId: string) {
    const db = getTenantDb(tenantSlug)

    const [deleted] = await db.update(bankAccount).set({
        deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        deletedByUserId: userId,
        updatedByUserId: userId,
        isActive: 0,
    })
        .where(and(eq(bankAccount.id, bankAccountId), isNull(bankAccount.deletedAt)))
        .returning({ id: bankAccount.id })

    if (!deleted) {
        throw new AppError("conta bancária não encontrada", 404, "BANK_ACCOUNT_NOT_FOUND")
    }

    return { ok: true }
}
