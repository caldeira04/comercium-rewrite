import { getApiUrl } from "@/lib/api-config"

export type AdminUser = {
    adminId: string
    name: string
    login: string
    role: "owner" | "admin"
}

export const adminCredentials = async () => {
    try {
        const response = await fetch(getApiUrl("/master/admin/auth/me"), {
            credentials: "include"
        })

        if (!response.ok) return { admin: null }

        return { admin: (await response.json()) as AdminUser }
    } catch {
        return { admin: null }
    }
}