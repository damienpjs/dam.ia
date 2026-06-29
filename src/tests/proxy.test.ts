import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}))

import { proxy, config } from "@/proxy"
import { checkRateLimit } from "@/lib/rate-limit"

function request(path: string, method: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 10, reset: 0 })
})

describe("proxy", () => {
  it("laisse passer les requêtes GET sans rate limiting", async () => {
    const response = await proxy(request("/api/chat", "GET"))

    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it("laisse passer une route non concernée", async () => {
    const response = await proxy(request("/api/llm/status", "POST"))

    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it("applique le rate limiting 'chat' sur POST /api/chat", async () => {
    await proxy(request("/api/chat", "POST"))

    expect(checkRateLimit).toHaveBeenCalledWith("1.2.3.4", "chat")
  })

  it("applique le rate limiting 'feedback' sur POST /api/feedback", async () => {
    await proxy(request("/api/feedback", "POST"))

    expect(checkRateLimit).toHaveBeenCalledWith("1.2.3.4", "feedback")
  })

  it("retourne 429 avec Retry-After quand la limite est dépassée", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 5000 })

    const response = await proxy(request("/api/chat", "POST"))

    expect(response.status).toBe(429)
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1)
    const data = await response.json()
    expect(data.error).toContain("Trop de requêtes")
  })

  it("expose un matcher ciblant les routes d'écriture", () => {
    expect(config.matcher).toContain("/api/chat/:path*")
    expect(config.matcher).toContain("/api/feedback/:path*")
  })
})
