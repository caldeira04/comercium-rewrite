import { createCategory, deleteCategory, getCategories, updateCategory } from "@/domain/tenant/category/CategoryService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const categories = new Elysia({ prefix: "/categories" })
    .use(authPlugin)

    .get("/", async ({ query, auth }) => {
        const includeDeleted = query.includeDeleted === "true"

        return await getCategories(auth.tenantSlug, includeDeleted)
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String(),
            })
        )
    })

    .post("/", async ({ body, auth }) => {
        return await createCategory(auth.tenantSlug, {
            name: body.name,
            userId: auth.userId,
        })
    }, {
        body: t.Object({
            name: t.String(),
        })
    })

    .patch("/:categoryId", async ({ params, body, auth }) => {
        return await updateCategory(auth.tenantSlug, {
            categoryId: Number(params.categoryId),
            name: body.name,
            userId: auth.userId,
        })
    }, {
        params: t.Object({
            categoryId: t.String(),
        }),
        body: t.Object({
            name: t.String(),
        })
    })

    .delete("/:categoryId", async ({ params, auth }) => {
        return await deleteCategory(auth.tenantSlug, Number(params.categoryId), auth.userId)
    }, {
        params: t.Object({
            categoryId: t.String(),
        })
    })

export default categories