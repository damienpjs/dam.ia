import { describe, it, expect } from "vitest"
import { QuotaExceededError, isQuotaExceededError } from "@/lib/llm/errors"

describe("QuotaExceededError", () => {
  it("a le bon nom et message par défaut", () => {
    const error = new QuotaExceededError()
    expect(error.name).toBe("QuotaExceededError")
    expect(error.message).toBe("Quota API dépassé")
    expect(error).toBeInstanceOf(Error)
  })

  it("accepte un message personnalisé", () => {
    const error = new QuotaExceededError("Limite atteinte")
    expect(error.message).toBe("Limite atteinte")
  })
})

describe("isQuotaExceededError", () => {
  it("retourne true pour une QuotaExceededError", () => {
    expect(isQuotaExceededError(new QuotaExceededError())).toBe(true)
  })

  it("retourne true pour une erreur contenant '429'", () => {
    expect(isQuotaExceededError(new Error("[429 Too Many Requests]"))).toBe(true)
  })

  it("retourne true pour une erreur contenant 'quota'", () => {
    expect(isQuotaExceededError(new Error("You exceeded your current quota"))).toBe(true)
  })

  it("retourne false pour une erreur sans rapport", () => {
    expect(isQuotaExceededError(new Error("Network error"))).toBe(false)
  })

  it("retourne false pour une valeur non-Error", () => {
    expect(isQuotaExceededError("some string")).toBe(false)
    expect(isQuotaExceededError(null)).toBe(false)
    expect(isQuotaExceededError(undefined)).toBe(false)
  })
})
