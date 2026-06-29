import { describe, it, expect } from "vitest"
import { isUuid } from "@/lib/validation"

describe("isUuid", () => {
  it("accepte un UUID v4 valide", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
  })

  it("accepte un UUID en majuscules", () => {
    expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true)
  })

  it("rejette une chaîne non-UUID", () => {
    expect(isUuid("session-abc")).toBe(false)
    expect(isUuid("123e4567e89b12d3a456426614174000")).toBe(false)
    expect(isUuid("")).toBe(false)
  })

  it("rejette les valeurs non-string", () => {
    expect(isUuid(undefined)).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(42)).toBe(false)
    expect(isUuid({})).toBe(false)
  })
})
