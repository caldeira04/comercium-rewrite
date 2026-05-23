import { createFileRoute, Link } from "@tanstack/react-router"
import LandingPage from "@/components/landing/landing-page"
import { BanknoteArrowUpIcon, BanknoteIcon, BarcodeIcon, ChartCandlestickIcon, HandCoinsIcon, LandmarkIcon, PackageIcon, PackageOpenIcon, PackageSearchIcon, SettingsIcon, ShoppingCartIcon, StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ResponseUser = {
    userId: number
    tenantSlug: string
    login: string
    tenantName: string
}

const items = [
    {
        label: "vendas",
        icon: <ShoppingCartIcon />,
        subitems: [
            {
                label: "pdv",
                url: "/sales/daily",
                icon: <StoreIcon />
            },
            {
                label: "histórico",
                url: "/sales/list",
                icon: <ChartCandlestickIcon />
            },
            {
                label: "rel. vendas",
                url: "/sales/report",
                icon: <BanknoteArrowUpIcon />
            }
        ]
    },
    {
        label: "estoque",
        icon: <PackageIcon />,
        subitems: [
            {
                label: "catálogo",
                url: "/products/list",
                icon: <PackageSearchIcon />
            },
            {
                label: "rel. estoque",
                url: "/products/report",
                icon: <PackageOpenIcon />
            }
        ]
    },
    {
        label: "caixa",
        icon: <BanknoteIcon />,
        subitems: [
            {
                label: "gerenciar caixa",
                url: "/cash/current",
                icon: <LandmarkIcon />
            },
            {
                label: "histórico",
                url: "/cash/list",
                icon: <HandCoinsIcon />
            },
            {
                label: "rel. caixas",
                url: "/cash/report",
                icon: <BanknoteArrowUpIcon />
            }
        ]
    },
    {
        label: "configurações",
        icon: <SettingsIcon />,
        url: "/settings"
    },
]

export const Route = createFileRoute("/")({
    loader: async () => {
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
    },
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={"ghost"}>{i.icon} {i.label}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48">
                                {i.subitems.map((s) => (
                                    <DropdownMenuItem>
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
                    <Button variant={"link"}>
                        <Link to={i.url} className="flex gap-2 items-center justify-center">
                            {i.icon} {i.label}
                        </Link>
                    </Button>
                )

            })}

        </div>
    )
}
