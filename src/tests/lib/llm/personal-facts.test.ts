import { describe, it, expect } from "vitest"
import { PERSONAL_FACTS, PERSONAL_FACTS_RULES, PRIVATE_TOPICS } from "@/constants/personal-facts"
import { PERSONA } from "@/constants/llm"
import { MOOD_DIRECTIVE } from "@/lib/llm/mood-tag"
import { buildPersonalFactsBlock, formatPersonalFact, matchesPersonalFact } from "@/lib/llm/personal-facts"
import { buildSystemPrompt } from "@/lib/llm/system-prompt"

describe("formatPersonalFact", () => {
  it("formate un fait seul", () => {
    expect(formatPersonalFact({ topic: "Couleur préférée", fact: "le vert", keywords: [] })).toBe("- Couleur préférée : le vert")
  })

  it("ajoute la raison quand elle existe", () => {
    expect(formatPersonalFact({ topic: "Sport", fact: "course à pied", why: "le minimalisme", keywords: [] })).toBe(
      "- Sport : course à pied. Pourquoi : le minimalisme",
    )
  })

  it("ajoute la réponse personnalisée entre guillemets", () => {
    expect(formatPersonalFact({ topic: "Plat préféré", fact: "magret", answer: "Saignant.", keywords: [] })).toBe(
      "- Plat préféré : magret. Réponse personnalisée : « Saignant. »",
    )
  })

  it("place la raison avant la réponse personnalisée", () => {
    const line = formatPersonalFact({ topic: "Sujet", fact: "fait", why: "raison", answer: "réponse", keywords: [] })
    expect(line).toBe("- Sujet : fait. Pourquoi : raison. Réponse personnalisée : « réponse »")
  })
})

describe("buildPersonalFactsBlock", () => {
  it("contient une ligne par fait de la fiche", () => {
    const block = buildPersonalFactsBlock()
    for (const fact of PERSONAL_FACTS) {
      expect(block).toContain(formatPersonalFact(fact))
    }
  })

  it("liste les sujets privés et les règles d'usage", () => {
    const block = buildPersonalFactsBlock()
    expect(block).toContain(PERSONAL_FACTS_RULES)
    expect(block).toContain(`Sujets privés (${PRIVATE_TOPICS.join(", ")})`)
  })

  it("accepte une fiche et des sujets privés sur mesure", () => {
    const block = buildPersonalFactsBlock([{ topic: "Couleur", fact: "le bleu", keywords: [] }], ["santé"])
    expect(block).toContain("- Couleur : le bleu")
    expect(block).toContain("Sujets privés (santé)")
    expect(block).not.toContain("Fight Club")
  })
})

describe("buildSystemPrompt avec la fiche perso", () => {
  it("insère la fiche entre le persona et la consigne d'humeur", () => {
    const prompt = buildSystemPrompt()
    const block = buildPersonalFactsBlock()

    expect(prompt.indexOf(PERSONA)).toBeLessThan(prompt.indexOf(block))
    expect(prompt.indexOf(block)).toBeLessThan(prompt.indexOf(MOOD_DIRECTIVE))
    expect(prompt.endsWith(MOOD_DIRECTIVE)).toBe(true)
  })
})

describe("matchesPersonalFact", () => {
  it("reconnaît une question sur un fait de la fiche", () => {
    expect(matchesPersonalFact("Quelle est ta boisson préférée ?")).toBe(true)
    expect(matchesPersonalFact("Quel est ton FILM favori ?")).toBe(true)
    expect(matchesPersonalFact("What's your favorite drink?")).toBe(true)
  })

  it("reconnaît une question sur les mangas et animes", () => {
    expect(matchesPersonalFact("Quel est ton manga préféré ?")).toBe(true)
    expect(matchesPersonalFact("T'as un animé favori ?")).toBe(true)
    expect(matchesPersonalFact("Do you watch anime?")).toBe(true)
  })

  it("ignore accents, casse et ponctuation", () => {
    expect(matchesPersonalFact("Ta couleur préférée, c'est laquelle ??")).toBe(true)
    expect(matchesPersonalFact("Café ou thé ?")).toBe(true)
  })

  it("ne se déclenche pas sur un mot qui en contient un autre", () => {
    expect(matchesPersonalFact("Quelle idée de projet te plaît ?")).toBe(false)
    expect(matchesPersonalFact("Tell me about the theme system")).toBe(false)
  })

  it("laisse passer les questions pro", () => {
    expect(matchesPersonalFact("Quelles sont tes compétences ?")).toBe(false)
    expect(matchesPersonalFact("Quel est ton parcours ?")).toBe(false)
  })

  it("accepte une fiche sur mesure", () => {
    const facts = [{ topic: "Animal", fact: "le chat", keywords: ["animal"] }]
    expect(matchesPersonalFact("Ton animal préféré ?", facts)).toBe(true)
    expect(matchesPersonalFact("Ta boisson préférée ?", facts)).toBe(false)
  })
})
