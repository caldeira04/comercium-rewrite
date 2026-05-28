import { getApiUrl } from "@/lib/api-config"

export type ResponseUser = {
    userId: number
    tenantSlug: string
    login: string
    tenantName: string
}

export const loaderCredentials = async () => {
    try {
        const response = await fetch(getApiUrl("/master/auth/me"), {
            credentials: "include"
        })

        if (!response.ok) return { user: null }

        return { user: (await response.json()) as ResponseUser }
    } catch {
        return { user: null }
    }
}
