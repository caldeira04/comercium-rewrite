import { createFileRoute, Link } from "@tanstack/react-router"
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

export const Route = createFileRoute("/")({
    loader: loaderCredentials,
    component: IndexPage
})

function IndexPage() {
    const { user } = Route.useLoaderData()

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
