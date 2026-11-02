import { describe, it, expect } from "vitest"
import { PERSONAL_FACTS, PERSONAL_FACTS_RULES, PRIVATE_TOPICS } from "@/constants/personal-facts"

const ALL_TEXT = [
  ...PERSONAL_FACTS.flatMap(({ topic, fact, why, answer }) => [topic, fact, why ?? "", answer ?? ""]),
  ...PRIVATE_TOPICS,
  PERSONAL_FACTS_RULES,
].join("\n")

describe("PERSONAL_FACTS", () => {
  it("renseigne un sujet et un fait pour chaque entrée", () => {
    for (const { topic, fact } of PERSONAL_FACTS) {
      expect(topic.trim()).not.toBe("")
      expect(fact.trim()).not.toBe("")
    }
  })

  it("n'a pas deux fois le même sujet", () => {
    const topics = PERSONAL_FACTS.map(({ topic }) => topic.toLowerCase())
    expect(new Set(topics).size).toBe(topics.length)
  })

  it("contient les goûts que le double doit connaître", () => {
    const topics = PERSONAL_FACTS.map(({ topic }) => topic)
    expect(topics).toEqual(expect.arrayContaining(["Couleur préférée", "Plat préféré", "Citation philosophique préférée"]))
  })

  it("date la pique sur les IDE de l'année en cours", () => {
    const ide = PERSONAL_FACTS.find(({ topic }) => topic.startsWith("Éditeur"))
    expect(ide?.answer).toContain(String(new Date().getFullYear()))
  })

  it("ne donne aucun chiffre de salaire", () => {
    const salary = PERSONAL_FACTS.find(({ topic }) => topic === "Prétentions salariales")
    expect(salary?.fact).toContain("ni chiffre ni fourchette")
    expect(salary?.fact).not.toMatch(/\d/)
  })

  it("n'emploie jamais de tiret cadratin", () => {
    expect(ALL_TEXT).not.toContain(String.fromCharCode(0x2014))
  })
})

describe("PRIVATE_TOPICS", () => {
  it("liste les sujets privés à décliner", () => {
    expect(PRIVATE_TOPICS).toEqual(
      expect.arrayContaining(["couple et vie amoureuse", "famille et enfants"]),
    )
    expect(PRIVATE_TOPICS.some((topic) => topic.startsWith("adresse précise"))).toBe(true)
  })
})

describe("PERSONAL_FACTS_RULES", () => {
  it("interdit d'inventer un fait absent de la fiche", () => {
    expect(PERSONAL_FACTS_RULES).toContain("absent de la fiche")
    expect(PERSONAL_FACTS_RULES).toContain("n'invente rien")
  })

  it("impose de reprendre la réponse personnalisée", () => {
    expect(PERSONAL_FACTS_RULES).toContain("Réponse personnalisée")
    expect(PERSONAL_FACTS_RULES).toContain("presque mot pour mot")
  })

  it("interdit de caser la fiche hors sujet", () => {
    expect(PERSONAL_FACTS_RULES).toContain("Ne glisse jamais ces faits dans une réponse qui n'en parle pas")
  })
})
