import { describe, it, expect } from "vitest"
import { byteLength, formatClock } from "@/lib/format"

describe("lib/format", () => {
  describe("byteLength", () => {
    it("compte un octet par caractère ASCII", () => {
      expect(byteLength("README")).toBe(6)
    })

    it("compte les accents et l'apostrophe typographique en UTF-8 (plusieurs octets)", () => {
      expect(byteLength("é")).toBe(2)
      expect(byteLength("’")).toBe(3)
    })

    it("renvoie 0 pour une chaîne vide", () => {
      expect(byteLength("")).toBe(0)
    })
  })

  describe("formatClock", () => {
    it("affiche l'heure sur 24 h, sans secondes", () => {
      expect(formatClock(new Date("2024-01-01T22:31:45"), "fr")).toBe("22:31")
      expect(formatClock(new Date("2024-01-01T09:05:00"), "en")).toBe("09:05")
    })
  })
})
