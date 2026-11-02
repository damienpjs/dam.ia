import { describe, it, expect } from "vitest"
import { ageOn } from "@/lib/age"

const BIRTH = new Date(1992, 0, 27)

describe("ageOn", () => {
  it("retire un an tant que l'anniversaire n'est pas passé", () => {
    expect(ageOn(BIRTH, new Date(2027, 0, 1))).toBe(34)
    expect(ageOn(BIRTH, new Date(2027, 0, 26))).toBe(34)
  })

  it("compte l'année le jour de l'anniversaire", () => {
    expect(ageOn(BIRTH, new Date(2027, 0, 27))).toBe(35)
  })

  it("compte l'année après l'anniversaire", () => {
    expect(ageOn(BIRTH, new Date(2026, 10, 2))).toBe(34)
    expect(ageOn(BIRTH, new Date(2027, 1, 1))).toBe(35)
  })

  it("prend maintenant comme date de référence par défaut", () => {
    expect(ageOn(new Date(2000, 0, 1))).toBe(new Date().getFullYear() - 2000)
  })
})
