import { describe, it, expect } from "vitest"
import { DICTIONARIES, SUGGESTION_IDS, getDictionary, type IDictionary } from "@/constants/dictionary"
import { DEFAULT_LOCALE, LOCALES, type TLocale } from "@/constants/i18n"

/** Aplatit un dictionnaire en une liste de chaînes affichables. */
function collectStrings(value: unknown, path: string, out: Array<{ path: string; value: string }>): void {
  if (typeof value === "string") {
    out.push({ path, value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out))
    return
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, `${path}.${key}`, out)
    }
  }
}

function stringsOf(dictionary: IDictionary): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = []
  collectStrings(dictionary, "", out)
  return out
}

describe("constants/dictionary", () => {
  it("fournit un dictionnaire pour chaque langue du sélecteur", () => {
    for (const locale of LOCALES) {
      expect(DICTIONARIES[locale]).toBeDefined()
    }
  })

  it("retourne le dictionnaire demandé", () => {
    expect(getDictionary("fr")).toBe(DICTIONARIES.fr)
    expect(getDictionary("en")).toBe(DICTIONARIES.en)
  })

  it("retombe sur la langue par défaut pour une langue inconnue", () => {
    expect(getDictionary("de" as TLocale)).toBe(DICTIONARIES[DEFAULT_LOCALE])
  })

  it("ne laisse aucune chaîne vide dans aucune langue", () => {
    for (const locale of LOCALES) {
      for (const { path, value } of stringsOf(DICTIONARIES[locale])) {
        expect(value.trim(), `${locale}${path} est vide`).not.toBe("")
      }
    }
  })

  it("expose exactement les mêmes clés dans les deux langues", () => {
    const frPaths = stringsOf(DICTIONARIES.fr).map((entry) => entry.path)
    const enPaths = stringsOf(DICTIONARIES.en).map((entry) => entry.path)
    expect(enPaths).toEqual(frPaths)
  })

  it("traduit chaque suggestion, et rien d'autre", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].chat.suggestions)).toEqual([...SUGGESTION_IDS])
    }
  })

  it("compose le décompte des technos masquées", () => {
    expect(DICTIONARIES.fr.landing.showMoreTechs(3)).toContain("3")
    expect(DICTIONARIES.en.landing.showMoreTechs(3)).toContain("3")
  })

  it("marque une seule expérience comme poste actuel dans chaque langue", () => {
    for (const locale of LOCALES) {
      const current = DICTIONARIES[locale].about.timeline.filter((entry) => entry.current)
      expect(current).toHaveLength(1)
      expect(current[0].org).toBe("Apizee")
    }
  })

  it("garde le même parcours (périodes et entreprises) d'une langue à l'autre", () => {
    const orgs = (locale: TLocale) => DICTIONARIES[locale].about.timeline.map((entry) => entry.org)
    expect(orgs("en")).toEqual(orgs("fr"))
    expect(DICTIONARIES.en.about.timeline).toHaveLength(DICTIONARIES.fr.about.timeline.length)
  })

  it("traduit réellement le contenu (les textes diffèrent d'une langue à l'autre)", () => {
    expect(DICTIONARIES.en.chat.welcome).not.toBe(DICTIONARIES.fr.chat.welcome)
    expect(DICTIONARIES.en.about.intro).not.toBe(DICTIONARIES.fr.about.intro)
    expect(DICTIONARIES.en.chat.providerLabels.mock).not.toBe(DICTIONARIES.fr.chat.providerLabels.mock)
  })
})
