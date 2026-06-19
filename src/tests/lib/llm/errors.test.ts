import { describe, it, expect } from "vitest"
import { QuotaExceededError, isQuotaExceededError, ServiceUnavailableError, isServiceUnavailableError } from "@/lib/llm/errors"

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

describe("ServiceUnavailableError", () => {
  it("a le bon nom et message par défaut", () => {
    const error = new ServiceUnavailableError()
    expect(error.name).toBe("ServiceUnavailableError")
    expect(error.message).toBe("Service LLM temporairement indisponible")
    expect(error).toBeInstanceOf(Error)
  })

  it("accepte un message personnalisé", () => {
    const error = new ServiceUnavailableError("Surcharge")
    expect(error.message).toBe("Surcharge")
  })
})

describe("isServiceUnavailableError", () => {
  it("retourne true pour une ServiceUnavailableError", () => {
    expect(isServiceUnavailableError(new ServiceUnavailableError())).toBe(true)
  })

  it("retourne true pour une erreur contenant '503'", () => {
    expect(isServiceUnavailableError(new Error("[503 Service Unavailable] This model is currently experiencing high demand"))).toBe(true)
  })

  it("retourne true pour une erreur contenant 'overloaded'", () => {
    expect(isServiceUnavailableError(new Error("The model is overloaded"))).toBe(true)
  })

  it("retourne true pour une erreur contenant 'unavailable' (insensible à la casse)", () => {
    expect(isServiceUnavailableError(new Error("Service UNAVAILABLE"))).toBe(true)
  })

  it("retourne false pour une erreur sans rapport", () => {
    expect(isServiceUnavailableError(new Error("Network error"))).toBe(false)
  })

  it("retourne false pour une valeur non-Error", () => {
    expect(isServiceUnavailableError("some string")).toBe(false)
    expect(isServiceUnavailableError(null)).toBe(false)
    expect(isServiceUnavailableError(undefined)).toBe(false)
  })
})
