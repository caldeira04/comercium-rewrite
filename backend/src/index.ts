import { createApp } from "./app"

export type { App } from "./app"

const port = Number(process.env.PORT ?? 3000)
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173"
const app = createApp({ corsOrigin }).listen(port)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
