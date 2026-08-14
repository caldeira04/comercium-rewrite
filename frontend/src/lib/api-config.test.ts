import { afterEach, describe, expect, it, vi } from "vitest"
import { getApiBaseUrl, getApiUrl } from "@/lib/api-config"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("getApiBaseUrl", () => {
    it("returns the default dev url", () => {
        expect(getApiBaseUrl()).toBe("http://localhost:3000")
    })

    it("uses the injected global override when present", () => {
        vi.stubGlobal("window", { __COMERCIUM_API_BASE_URL__: "http://api.example.com" })

        expect(getApiBaseUrl()).toBe("http://api.example.com")
    })

    it("reads apiBaseUrl from the query string", () => {
        vi.stubGlobal("window", {
            location: { search: "?apiBaseUrl=http://custom.example.com" },
        })

        expect(getApiBaseUrl()).toBe("http://custom.example.com")
    })
})

describe("getApiUrl", () => {
    it("resolves relative paths against the base url", () => {
        expect(getApiUrl("/master/auth/me")).toBe("http://localhost:3000/master/auth/me")
    })
})