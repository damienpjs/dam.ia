import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const { mockLimit, RedisMock, RatelimitMock } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  return {
    mockLimit,
    RedisMock: vi.fn(),
    RatelimitMock: vi.fn(function () {
      return { limit: mockLimit }
    }),
  }
})

vi.mock("@upstash/redis", () => ({
  Redis: RedisMock,
}))

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(RatelimitMock, {
    slidingWindow: vi.fn(() => "sliding-window-limiter"),
  }),
}))

import { checkRateLimit, getClientIp, resetRateLimiters } from "@/lib/rate-limit"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimiters()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("getClientIp", () => {
  function requestWith(headers: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost/api/chat", { method: "POST", headers })
  }

  it("retourne la première IP de x-forwarded-for", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4")
  })

  it("retombe sur x-real-ip", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9")
  })

  it("retourne 'anonymous' sans en-tête d'IP", () => {
    expect(getClientIp(requestWith({}))).toBe("anonymous")
  })
})

describe("checkRateLimit", () => {
  it("autorise toujours quand Upstash n'est pas configuré", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const result = await checkRateLimit("1.2.3.4", "chat")

    expect(result.success).toBe(true)
    expect(RatelimitMock).not.toHaveBeenCalled()
    expect(mockLimit).not.toHaveBeenCalled()
  })

  it("délègue à Upstash quand il est configuré", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "token"
    mockLimit.mockResolvedValue({ success: true, remaining: 14, reset: 1000 })

    const result = await checkRateLimit("1.2.3.4", "chat")

    expect(result).toEqual({ success: true, remaining: 14, reset: 1000 })
    expect(mockLimit).toHaveBeenCalledWith("1.2.3.4")
  })

  it("retourne success=false quand la limite est dépassée", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "token"
    mockLimit.mockResolvedValue({ success: false, remaining: 0, reset: 5000 })

    const result = await checkRateLimit("1.2.3.4", "feedback")

    expect(result.success).toBe(false)
    expect(result.reset).toBe(5000)
  })

  it("réutilise le limiteur mis en cache entre les appels", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "token"
    mockLimit.mockResolvedValue({ success: true, remaining: 1, reset: 0 })

    await checkRateLimit("1.2.3.4", "chat")
    await checkRateLimit("5.6.7.8", "chat")

    // Un seul limiteur "chat" construit malgré deux appels
    expect(RatelimitMock).toHaveBeenCalledTimes(1)
  })

  it("réutilise le client Redis entre des types de limites différents", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "token"
    mockLimit.mockResolvedValue({ success: true, remaining: 1, reset: 0 })

    await checkRateLimit("1.2.3.4", "chat")
    await checkRateLimit("1.2.3.4", "feedback")

    // Un seul client Redis instancié, mais un limiteur par type
    expect(RedisMock).toHaveBeenCalledTimes(1)
    expect(RatelimitMock).toHaveBeenCalledTimes(2)
  })
})
