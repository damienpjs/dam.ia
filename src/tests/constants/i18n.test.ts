import { describe, it, expect } from "vitest"
import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, LOCALE_STORAGE_KEY, isLocale } from "@/constants/i18n"

describe("constants/i18n", () => {
  it("expose les deux langues du sélecteur, français en premier", () => {
    expect(LOCALES).toEqual(["fr", "en"])
    expect(DEFAULT_LOCALE).toBe("fr")
    expect(LOCALES).toContain(DEFAULT_LOCALE)
  })

  it("libelle chaque langue en deux lettres capitales (wording « FR / EN »)", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]).toBe(locale.toUpperCase())
    }
  })

  it("nomme une clé de stockage préfixée par le projet", () => {
    expect(LOCALE_STORAGE_KEY).toBe("dam_ia_locale")
  })

  it("reconnaît les langues supportées", () => {
    expect(isLocale("fr")).toBe(true)
    expect(isLocale("en")).toBe(true)
  })

  it("rejette toute valeur qui n'est pas une langue supportée", () => {
    expect(isLocale("es")).toBe(false)
    expect(isLocale("FR")).toBe(false)
    expect(isLocale("")).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(42)).toBe(false)
    expect(isLocale(["fr"])).toBe(false)
  })
})
