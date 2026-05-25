import { treaty } from "@elysiajs/eden"
import type { App } from "backend/index"

const baseURL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
const client = treaty<App>(baseURL, { parseDate: false })

export const api = client
