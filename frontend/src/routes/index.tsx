import { createFileRoute } from "@tanstack/react-router"
import LandingPage from "@/components/landing/landing-page"

type ResponseUser = {
    userId: number
    tenantSlug: string
    login: string
}

export const Route = createFileRoute("/")({
    loader: async () => {
        try {
            const response = await fetch("http://localhost:3000/master/auth/me", {
                credentials: "include"
            })

            if (!response.ok) return { user: null }

            return { user: (await response.json()) as ResponseUser }
        } catch {
            return { user: null }
        }
    },
    component: IndexPage
})

function IndexPage() {
    const { user } = Route.useLoaderData()

    if (user) {
        return <Home />
    }

    return <LandingPage />
}

function Home() {
    return (
        <div>Hello from home</div>
    )
}
