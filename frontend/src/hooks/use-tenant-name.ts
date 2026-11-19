import { useQuery } from "@tanstack/react-query"
import { loaderCredentials } from "@/utils/auth"

// Nome do tenant logado (cabeçalho dos relatórios exportados). Reaproveita a
// consulta "auth/me" que a raiz já mantém em cache.
export function useTenantName() {
    const { data } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: loaderCredentials,
        staleTime: Infinity,
    })

    return data?.user?.tenantName ?? ""
}
