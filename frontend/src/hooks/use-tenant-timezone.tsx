import { createContext, useCallback, useContext, useMemo } from "react"
import { DEFAULT_TIME_ZONE, formatDateTimeInZone, monthRangeInTimeZone, todayInTimeZone } from "@/utils/time"

const TenantTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE)

export function TenantTimeZoneProvider({ timeZone, children }: {
    timeZone?: string | null
    children: React.ReactNode
}) {
    return (
        <TenantTimeZoneContext.Provider value={timeZone || DEFAULT_TIME_ZONE}>
            {children}
        </TenantTimeZoneContext.Provider>
    )
}

// Fuso configurado para o tenant. Datas e horas exibidas no sistema usam este
// fuso, e não o do navegador, para bater com os filtros aplicados no backend.
export function useTenantTimeZone() {
    return useContext(TenantTimeZoneContext)
}

// Formata timestamps do banco (UTC) no fuso do tenant.
export function useFormatDateTime() {
    const timeZone = useTenantTimeZone()

    return useCallback(
        (value: string | null | undefined) => formatDateTimeInZone(value ?? null, timeZone),
        [timeZone],
    )
}

// "Hoje" e o mês corrente no fuso do tenant, como valores de <input type="date">.
export function useTenantDates() {
    const timeZone = useTenantTimeZone()
    const today = todayInTimeZone(timeZone)

    return useMemo(() => ({ today, ...monthRangeInTimeZone(timeZone) }), [today, timeZone])
}
