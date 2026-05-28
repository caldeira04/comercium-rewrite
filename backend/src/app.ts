import { Elysia } from "elysia"
import { cors } from "@elysia/cors"
import auth from "./routes/master/auth"
import tenants from "./routes/master/tenants"
import onboarding from "./routes/master/onboarding"
import products from "./routes/tenants/products"
import { authPlugin } from "./utils/elysia"
import sales from "./routes/tenants/sales"
import clients from "./routes/tenants/clients"
import cash from "./routes/tenants/cash"
import payment from "./routes/tenants/payments"
import stock from "./routes/tenants/stock"

export function createApp({ corsOrigin = "http://localhost:5173" }: {
    corsOrigin?: string
} = {}) {
    return new Elysia()
        .use(cors({
            origin: corsOrigin,
            credentials: true,
        }))
        .group('/master', (master) =>
            master
                .use(auth)
                .use(tenants)
                .use(onboarding)
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
        )
        .get("/", () => "Hello Elysia")
}

export type App = ReturnType<typeof createApp>
