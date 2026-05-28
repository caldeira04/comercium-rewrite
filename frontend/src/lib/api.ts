import { treaty } from "@elysiajs/eden"
import type { App } from "backend/index"
import { getApiBaseUrl } from "@/lib/api-config"

const baseURL = getApiBaseUrl()
const client = treaty<App>(baseURL, { parseDate: false, fetch: { credentials: "include" } })

export const api = client
