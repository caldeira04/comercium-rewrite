import { HeadContent, Scripts, createRootRoute, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import appCss from "../styles.css?url"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "next-themes"
import AppSidebar from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { loaderCredentials } from "@/utils/auth"

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
                title: "TanStack Start Starter",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    notFoundComponent: () => (
        <main className="container mx-auto p-4 pt-16">
            <h1>404</h1>
            <p>The requested page could not be found.</p>
        </main>
    ),
    shellComponent: RootDocument,
    loader: loaderCredentials
})

function RootDocument({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation()
    const isSidebarVisible = pathname !== "/" && pathname !== "/login" && pathname !== "/register" && pathname !== "/onboarding"

    const { user } = Route.useLoaderData()

    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <SidebarProvider>
                        <div className="flex w-full min-h-screen items-center justify-center">
                            {isSidebarVisible && user && (
                                <AppSidebar
                                    login={user.login}
                                    tenantName={user.tenantName}
                                    tenantSlug={user.tenantSlug}
                                    userId={user.userId}
                                />
                            )}

                            <TooltipProvider>
                                {children}
                            </TooltipProvider>
                            <Toaster />
                        </div>
                    </SidebarProvider>
                </ThemeProvider>
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
                <Scripts />
            </body>
        </html >
    )
}
