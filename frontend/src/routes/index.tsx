import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import LandingPage from "@/components/landing/landing-page"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type ResponseUser } from "@/utils/auth"
import { loaderCredentials } from "@/utils/auth"
import { items } from "@/components/items"
import { getApiUrl } from "@/lib/api-config"

export const Route = createFileRoute("/")({
    loader: loaderCredentials,
    component: IndexPage
})

function IndexPage() {
    const { user } = Route.useLoaderData()
    const navigate = useNavigate()

    // Check if system is set up
    const { data: setupStatus } = useQuery({
        queryKey: ['onboarding-status'],
        queryFn: async () => {
            const response = await fetch(getApiUrl("/master/onboarding/status"))
            if (!response.ok) throw new Error("Failed to check setup status")
            return response.json()
        }
    })

    // If system is not set up and user is not logged in, redirect to onboarding
    if (setupStatus && !setupStatus.isSetup && !user) {
        setTimeout(() => {
            navigate({ to: '/onboarding' })
        }, 0)
        return null
    }

    if (user) {
        return <Home user={user} />
    }

    return <LandingPage />
}

function Home({ user }: { user: ResponseUser }) {
    return (
        <div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-bold text-2xl">{user.tenantName}</h1>
                    <h2 className="text-muted-foreground">{user.tenantSlug}</h2>
                </div>
                <h2 className="text-muted-foreground">{user.login}</h2>
            </div>
            {items.map((i) => {
                const hasSubitem = i.subitems && i.subitems?.length > 0
                if (hasSubitem) {
                    return (
                        <DropdownMenu key={i.label}>
                            <DropdownMenuTrigger asChild>
                                <Button variant={"ghost"}>{i.icon} {i.label}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48">
                                {i.subitems.map((s) => (
                                    <DropdownMenuItem key={s.label}>
                                        <Button variant={"link"}>
                                            <Link to={s.url} className="flex gap-2 items-center justify-center">
                                                {s.icon} {s.label}
                                            </Link>
                                        </Button>

                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                }

                return (
                    <Button key={i.label} variant={"link"}>
                        <Link to={i.url} className="flex gap-2 items-center justify-center">
                            {i.icon} {i.label}
                        </Link>
                    </Button>
                )

            })}

        </div>
    )
}
