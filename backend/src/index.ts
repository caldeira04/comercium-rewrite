import { Elysia } from "elysia"
import auth from "./routes/master/auth"
import tenants from "./routes/master/tenants"
import products from "./routes/tenants/products"
import { authPlugin } from "./utils/elysia"
import { cors } from "@elysia/cors"

const app = new Elysia()
    .use(cors())
    .group('/master', (master) =>
        master
            .use(auth)
            .use(tenants)
    )
    .group('/tenant', (tenant) =>
        tenant
            .use(authPlugin)
            .use(products)
    )
    .get("/", () => "Hello Elysia")
    .listen(3000)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
