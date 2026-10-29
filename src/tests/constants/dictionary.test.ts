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

  it("compose les tailles de fichiers, en octets puis en kilo-octets", () => {
    expect(DICTIONARIES.fr.common.fileSize(431)).toBe("(431 o)")
    expect(DICTIONARIES.fr.common.fileSize(307_425)).toBe("(300 Ko)")
    expect(DICTIONARIES.en.common.fileSize(431)).toBe("(431 B)")
    expect(DICTIONARIES.en.common.fileSize(307_425)).toBe("(300 KB)")
  })

  it("accorde les décomptes d'éléments et de messages", () => {
    expect(DICTIONARIES.fr.common.itemCount(1)).toBe("(1 élément)")
    expect(DICTIONARIES.fr.common.itemCount(3)).toBe("(3 éléments)")
    expect(DICTIONARIES.en.common.itemCount(1)).toBe("(1 item)")
    expect(DICTIONARIES.en.common.itemCount(3)).toBe("(3 items)")
    expect(DICTIONARIES.fr.chat.messageCount(1)).toBe("(1 message)")
    expect(DICTIONARIES.en.chat.messageCount(4)).toBe("(4 messages)")
  })

  it("garde le même parcours (périodes et entreprises) d'une langue à l'autre", () => {
    const orgs = (locale: TLocale) => DICTIONARIES[locale].about.experience.map((entry) => `${entry.org} ${entry.period.slice(0, 4)}`)
    expect(orgs("en")).toEqual(orgs("fr"))
    const projects = (locale: TLocale) => DICTIONARIES[locale].about.projects.map((project) => project.href)
    expect(projects("en")).toEqual(projects("fr"))
  })

  it("garde le même nombre de tâches et de fichiers hors écran d'une langue à l'autre", () => {
    expect(DICTIONARIES.en.about.todoDone).toHaveLength(DICTIONARIES.fr.about.todoDone.length)
    expect(DICTIONARIES.en.about.offscreen).toHaveLength(DICTIONARIES.fr.about.offscreen.length)
  })

  it("traduit réellement le contenu (les textes diffèrent d'une langue à l'autre)", () => {
    expect(DICTIONARIES.en.chat.welcome).not.toBe(DICTIONARIES.fr.chat.welcome)
    expect(DICTIONARIES.en.about.readme).not.toBe(DICTIONARIES.fr.about.readme)
    expect(DICTIONARIES.en.common.navAbout).not.toBe(DICTIONARIES.fr.common.navAbout)
  })

  it("inclut le libellé visible de chaque action dans son nom accessible (WCAG 2.5.3)", () => {
    for (const locale of LOCALES) {
      const { chat } = DICTIONARIES[locale]
      const visible = (label: string) => label.replace(/[^\p{L}\s]/gu, "").trim().toLowerCase()
      expect(chat.copy.toLowerCase()).toContain(visible(chat.copyLabel))
      expect(chat.reuse.toLowerCase()).toContain(visible(chat.reuseLabel))
      expect(chat.reset.toLowerCase()).toContain(visible(chat.resetLabel))
      expect(chat.sendAria.toLowerCase()).toContain(visible(chat.send))
    }
  })
})
