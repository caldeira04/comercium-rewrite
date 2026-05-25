import { treaty } from "@elysiajs/eden"
import type { App } from "backend/index"

const baseURL = "http://localhost:3000"
const client = treaty<App>(baseURL, { parseDate: false, fetch: { credentials: "include" } })

export const api = client
