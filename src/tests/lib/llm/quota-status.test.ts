import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { markQuotaExceeded, markOperational, isQuotaExceeded, resetQuotaStatus } from "@/lib/llm/quota-status"
import { QUOTA_STATUS_TTL_MS } from "@/constants/llm"

describe("quota-status", () => {
  beforeEach(() => {
    resetQuotaStatus()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetQuotaStatus()
  })

  it("un provider inconnu n'est pas considéré en quota atteint", () => {
    expect(isQuotaExceeded("gemini")).toBe(false)
  })

  it("marque un provider comme ayant atteint son quota", () => {
    markQuotaExceeded("gemini")
    expect(isQuotaExceeded("gemini")).toBe(true)
  })

  it("markOperational efface immédiatement le statut", () => {
    markQuotaExceeded("groq")
    markOperational("groq")
    expect(isQuotaExceeded("groq")).toBe(false)
  })

  it("isole le statut entre providers", () => {
    markQuotaExceeded("gemini")
    expect(isQuotaExceeded("groq")).toBe(false)
  })

  it("expire le statut passé le TTL et le purge", () => {
    vi.useFakeTimers()
    markQuotaExceeded("gemini")
    expect(isQuotaExceeded("gemini")).toBe(true)

    vi.advanceTimersByTime(QUOTA_STATUS_TTL_MS + 1)
    expect(isQuotaExceeded("gemini")).toBe(false)
  })

  it("conserve le statut juste avant l'expiration du TTL", () => {
    vi.useFakeTimers()
    markQuotaExceeded("groq")

    vi.advanceTimersByTime(QUOTA_STATUS_TTL_MS - 1)
    expect(isQuotaExceeded("groq")).toBe(true)
  })

  it("resetQuotaStatus efface tous les providers", () => {
    markQuotaExceeded("gemini")
    markQuotaExceeded("groq")
    resetQuotaStatus()
    expect(isQuotaExceeded("gemini")).toBe(false)
    expect(isQuotaExceeded("groq")).toBe(false)
  })
})
