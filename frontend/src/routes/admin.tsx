import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router"
import { AdminLayout } from "@/components/admin/admin-layout"
import { adminCredentials } from "@/utils/admin-auth"

export const Route = createFileRoute("/admin")({
    loader: adminCredentials,
    component: AdminRouteComponent,
})

function AdminRouteComponent() {
    const { admin } = Route.useLoaderData()
    const { pathname } = useLocation()
    const isLogin = pathname === "/admin/login" || pathname === "/admin/login/"

    if (isLogin) {
        return <Outlet />
    }

    if (!admin) {
        return <Navigate to="/admin/login" />
    }

    return <AdminLayout admin={admin} />
}