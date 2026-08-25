import { createRouter } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { queryClient } from "@/lib/queryClient"

export function getRouter() {
    const router = createRouter({
        routeTree,

        context: { queryClient },
        Wrap: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
        scrollRestoration: true,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    })

    return router
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>
    }
}
