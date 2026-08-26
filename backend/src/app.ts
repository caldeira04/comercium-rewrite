import { Elysia } from "elysia"
import { cors } from "@elysia/cors"
import auth from "./routes/master/auth"
import tenants from "./routes/master/tenants"
import users from "./routes/master/users"
import onboarding from "./routes/master/onboarding"
import { adminPublic, adminProtected } from "./routes/master/admin"
import products from "./routes/tenants/products"
import { authPlugin } from "./utils/elysia"
import sales from "./routes/tenants/sales"
import clients from "./routes/tenants/clients"
import cash from "./routes/tenants/cash"
import payment from "./routes/tenants/payments"
import stock from "./routes/tenants/stock"
import categories from "./routes/tenants/categories"
import { AppError } from "./utils/errors"
import { db } from "@/db/db"
import { systemError } from "@/db/schema/master/admin"

function recordSystemError(request: { method: string, url: string }, error: unknown, statusCode: number) {
    try {
        const path = request.url ? new URL(request.url).pathname : undefined
        const message = error instanceof Error ? error.message : String(error)
        const errorCode = error instanceof AppError ? error.code : undefined
        const stack = error instanceof Error ? error.stack : undefined

        db.insert(systemError).values({
            method: request.method,
            path,
            statusCode,
            errorCode,
            message: message.slice(0, 2000),
            stack: stack ? stack.slice(0, 4000) : undefined,
        }).then().catch((err) => console.error("failed to record system error:", err))
    } catch {
        // never let error recording break the request
    }
}

export function createApp({ corsOrigin = "http://localhost:5173" }: {
    corsOrigin?: string | string[]
} = {}) {
    return new Elysia()
        .onError(({ code, error, set, request }) => {
            if (error instanceof AppError) {
                set.status = error.statusCode

                if (error.statusCode >= 500) {
                    recordSystemError(request, error, error.statusCode)
                }

                return {
                    error: error.code,
                    message: error.message,
                }
            }

            if (code === "VALIDATION") {
                set.status = 422

                return {
                    error: "VALIDATION_ERROR",
                    message: "dados inválidos",
                }
            }

            if (code === "NOT_FOUND") {
                set.status = 404

                return {
                    error: "NOT_FOUND",
                    message: "rota não encontrada",
                }
            }

            console.error(error)

            set.status = 500
            recordSystemError(request, error, 500)

            return {
                error: "INTERNAL_SERVER_ERROR",
                message: "erro interno do servidor",
            }
        })
        .use(cors({
            origin: corsOrigin,
            credentials: true,
        }))
        .group('/master', (master) =>
            master
                .use(auth)
                .use(tenants)
                .use(users)
                .use(onboarding)
        )
        .group('/admin', (admin) =>
            admin
                .use(adminPublic)
                .use(adminProtected)
        )
        .group('/tenant', (tenant) =>
            tenant
                .use(authPlugin)
                .use(products)
                .use(sales)
                .use(clients)
                .use(cash)
                .use(payment)
                .use(stock)
                .use(categories)
        )
        .get("/", () => "Hello Elysia")
}

export type App = ReturnType<typeof createApp>