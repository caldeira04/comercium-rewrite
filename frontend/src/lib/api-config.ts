declare global {
    interface Window {
        __COMERCIUM_API_BASE_URL__?: string
    }
}

export function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.__COMERCIUM_API_BASE_URL__) {
        return window.__COMERCIUM_API_BASE_URL__
    }

    if (typeof window !== "undefined") {
        const apiBaseUrl = new URLSearchParams(window.location.search).get("apiBaseUrl")
        if (apiBaseUrl) return apiBaseUrl
    }

    return import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"
}

export function getApiUrl(path: string) {
    return new URL(path, getApiBaseUrl()).toString()
}

export { }
