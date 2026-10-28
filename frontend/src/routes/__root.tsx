import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import appCss from "../styles.css?url"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "next-themes"
import AppSidebar from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { loaderCredentials } from "@/utils/auth"
import { useQuery } from "@tanstack/react-query"

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "Comercium — Gestão comercial",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
            // Monograma do design system; o .ico fica para navegadores sem SVG
            { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
            { rel: "icon", href: "/favicon.ico", sizes: "any" },
            { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
            { rel: "manifest", href: "/manifest.json" },
        ],
    }),
    notFoundComponent: () => (
        <main className="container mx-auto p-4 pt-16">
            <h1>404</h1>
            <p>The requested page could not be found.</p>
        </main>
    ),
    shellComponent: RootShell,
    component: RootComponent,
    ssr: false,
    loader: loaderCredentials
})

function RootShell({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    )
}

function RootComponent() {
    const { pathname } = useLocation()
    const normalizedPathname = pathname.replace(/\/$/, "") || "/"
    const isAdminPath = normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/")
    const isSidebarVisible = !isAdminPath && !["/", "/login", "/register", "/onboarding"].includes(normalizedPathname)

    const loaderData = Route.useLoaderData()
    const { data: authData } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: loaderCredentials,
        initialData: loaderData,
    })
    const user = authData.user

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            {isAdminPath ? (
                <TooltipProvider>
                    <Outlet />
                    <Toaster />
                </TooltipProvider>
            ) : (
                <SidebarProvider>
                    <div className="flex min-h-svh w-full">
                        {isSidebarVisible && user && (
                            <AppSidebar
                                login={user.login}
                                tenantName={user.tenantName}
                                tenantSlug={user.tenantSlug}
                                userId={user.userId}
                            />
                        )}

                        <TooltipProvider>
                            <div className={`relative flex min-h-svh min-w-0 flex-1 flex-col ${!isSidebarVisible ? "items-center justify-center" : ""} ${user?.impersonatedByAdminId ? "pt-10" : ""}`}>
                                {user?.impersonatedByAdminId && (
                                    <ImpersonationBanner tenantName={user.tenantName} />
                                )}
                                <Outlet />
                            </div>
                        </TooltipProvider>
                        <Toaster />
                    </div>
                </SidebarProvider>
            )}
            <TanStackDevtools
                config={{
                    position: "bottom-right",
                }}
                plugins={[
                    {
                        name: "Tanstack Router",
                        render: <TanStackRouterDevtoolsPanel />,
                    },
                ]}
            />
        </ThemeProvider>
    )
}
