import {
    createExpenseCategory,
    deleteExpenseCategory,
    getExpenseCategories,
    updateExpenseCategory,
} from "@/domain/tenant/payables/ExpenseCategoriesService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const expenseCategories = new Elysia({ prefix: "/expense-categories" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        return await getExpenseCategories(auth.tenantSlug, {
            includeDeleted: query.includeDeleted === "true",
        })
    }, {
        query: t.Partial(t.Object({
            includeDeleted: t.String(),
        })),
    })

    .post("/", async ({ body, auth }) => {
        return await createExpenseCategory(auth.tenantSlug, {
            name: body.name,
            userId: auth.userId,
        })
    }, {
        body: t.Object({
            name: t.String(),
        }),
    })

    .patch("/:categoryId", async ({ body, params, auth }) => {
        return await updateExpenseCategory(auth.tenantSlug, {
            categoryId: params.categoryId,
            name: body.name,
            userId: auth.userId,
        })
    }, {
        body: t.Object({
            name: t.String(),
        }),
        params: t.Object({
            categoryId: t.String(),
        }),
    })

    .delete("/:categoryId", async ({ params, auth }) => {
        return await deleteExpenseCategory(auth.tenantSlug, params.categoryId, auth.userId)
    }, {
        params: t.Object({
            categoryId: t.String(),
        }),
    })

export default expenseCategories
