import { Elysia } from "elysia"
import auth from "@/routes/auth"
import tenants from "@/routes/tenants"

const app = new Elysia()
    .use(auth)
    .use(tenants)
    .get("/", () => "Hello Elysia")
    .listen(3000)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
