import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/llm/status/route"
import { getConfiguredProviderNames } from "@/lib/llm"
import { isQuotaExceeded } from "@/lib/llm/quota-status"

vi.mock("@/lib/llm", () => ({
  getConfiguredProviderNames: vi.fn(),
}))

vi.mock("@/lib/llm/quota-status", () => ({
  isQuotaExceeded: vi.fn(),
}))

describe("GET /api/llm/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retourne une liste vide en mode mock (aucun provider configuré)", async () => {
    vi.mocked(getConfiguredProviderNames).mockReturnValue([])

    const response = await GET()

    expect(response.headers.get("Content-Type")).toBe("application/json")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(await response.json()).toEqual({ providers: [] })
  })

  it("mappe le statut de quota de chaque provider configuré", async () => {
    vi.mocked(getConfiguredProviderNames).mockReturnValue(["gemini", "groq"])
    vi.mocked(isQuotaExceeded).mockImplementation((name) => name === "groq")

    const response = await GET()

    expect(await response.json()).toEqual({
      providers: [
        { name: "gemini", quotaExceeded: false },
        { name: "groq", quotaExceeded: true },
      ],
    })
  })

  it("retourne un seul provider quand un seul est configuré", async () => {
    vi.mocked(getConfiguredProviderNames).mockReturnValue(["gemini"])
    vi.mocked(isQuotaExceeded).mockReturnValue(false)

    const response = await GET()

    expect(await response.json()).toEqual({ providers: [{ name: "gemini", quotaExceeded: false }] })
  })
})
