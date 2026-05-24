export type ResponseUser = {
    userId: number
    tenantSlug: string
    login: string
    tenantName: string
}

export const loaderCredentials = async () => {
    try {
        const headers = new Headers()

        if (typeof document === "undefined") {
            const { getRequestHeader } = await import("@tanstack/react-start/server")
            const cookie = getRequestHeader("cookie")

            if (cookie) {
                headers.set("cookie", cookie)
            }
        }

        const response = await fetch("http://localhost:3000/master/auth/me", {
            headers,
            credentials: "include"
        })

        if (!response.ok) return { user: null }

        return { user: (await response.json()) as ResponseUser }
    } catch {
        return { user: null }
    }
}

