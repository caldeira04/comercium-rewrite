import {
    bankAccountKinds,
    createBankAccount,
    deleteBankAccount,
    getBankAccounts,
    updateBankAccount,
    type BankAccountKind,
} from "@/domain/tenant/payables/BankAccountsService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const bankAccountBody = t.Object({
    name: t.String(),
    kind: t.Optional(t.UnionEnum(bankAccountKinds)),
    bankName: t.Optional(t.Nullable(t.String())),
    agency: t.Optional(t.Nullable(t.String())),
    accountNumber: t.Optional(t.Nullable(t.String())),
    isActive: t.Optional(t.Boolean()),
})

const bankAccounts = new Elysia({ prefix: "/bank-accounts" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        return await getBankAccounts(auth.tenantSlug, {
            includeDeleted: query.includeDeleted === "true",
        })
    }, {
        query: t.Partial(t.Object({
            includeDeleted: t.String(),
        })),
    })

    .post("/", async ({ body, auth }) => {
        return await createBankAccount(auth.tenantSlug, {
            name: body.name,
            kind: body.kind as BankAccountKind | undefined,
            bankName: body.bankName,
            agency: body.agency,
            accountNumber: body.accountNumber,
            userId: auth.userId,
        })
    }, {
        body: bankAccountBody,
    })

    .patch("/:bankAccountId", async ({ body, params, auth }) => {
        return await updateBankAccount(auth.tenantSlug, {
            bankAccountId: params.bankAccountId,
            name: body.name,
            kind: body.kind as BankAccountKind | undefined,
            bankName: body.bankName,
            agency: body.agency,
            accountNumber: body.accountNumber,
            isActive: body.isActive,
            userId: auth.userId,
        })
    }, {
        body: bankAccountBody,
        params: t.Object({
            bankAccountId: t.String(),
        }),
    })

    .delete("/:bankAccountId", async ({ params, auth }) => {
        return await deleteBankAccount(auth.tenantSlug, params.bankAccountId, auth.userId)
    }, {
        params: t.Object({
            bankAccountId: t.String(),
        }),
    })

export default bankAccounts
