import { describe, it, expect } from "vitest"
import { findRepeatedQuestion, normalizeQuestion, levenshtein } from "@/lib/llm/repeated-question"

describe("normalizeQuestion", () => {
  it("met en minuscules et supprime les accents", () => {
    expect(normalizeQuestion("Quel est ton PARCOURS Académique ?")).toBe("quel est ton parcours academique")
  })

  it("supprime la ponctuation et compacte les espaces", () => {
    expect(normalizeQuestion("  Bonjour,   ça    va ?! ")).toBe("bonjour ca va")
  })

  it("retourne une chaîne vide pour une entrée vide", () => {
    expect(normalizeQuestion("")).toBe("")
  })
})

describe("levenshtein", () => {
  it("retourne 0 pour deux chaînes identiques", () => {
    expect(levenshtein("parcours", "parcours")).toBe(0)
  })

  it("retourne la longueur de l'autre quand l'une est vide", () => {
    expect(levenshtein("", "abc")).toBe(3)
    expect(levenshtein("abc", "")).toBe(3)
  })

  it("compte les substitutions/insertions/suppressions", () => {
    expect(levenshtein("chat", "chats")).toBe(1)
    expect(levenshtein("parcours", "parcour")).toBe(1)
    expect(levenshtein("kitten", "sitting")).toBe(3)
  })
})

describe("findRepeatedQuestion", () => {
  it("retourne null quand il n'y a aucune question précédente", () => {
    expect(findRepeatedQuestion("Quelles sont tes compétences ?", [])).toBeNull()
  })

  it("détecte une question strictement identique", () => {
    const result = findRepeatedQuestion("Quelles sont tes compétences ?", ["Quel est ton parcours ?", "Quelles sont tes compétences ?"])
    expect(result).toEqual({ original: "Quelles sont tes compétences ?", turnsAgo: 1 })
  })

  it("détecte une question identique malgré casse, accents et ponctuation", () => {
    const result = findRepeatedQuestion("quelles sont tes competences", ["Quelles sont tes compétences ?!"])
    expect(result?.original).toBe("Quelles sont tes compétences ?!")
  })

  it("détecte une question quasi-identique (faute de frappe)", () => {
    const result = findRepeatedQuestion("Quelles sont tes compétences techniques", ["Quelles sont tes competance techniques"])
    expect(result).not.toBeNull()
  })

  it("ne confond pas deux sujets proches mais distincts", () => {
    expect(findRepeatedQuestion("Quelles sont tes compétences ?", ["Quelles sont tes passions ?"])).toBeNull()
  })

  it("calcule turnsAgo depuis la première occurrence", () => {
    const result = findRepeatedQuestion("Quel est ton parcours professionnel ?", ["Quel est ton parcours professionnel ?", "Et tes hobbies ?", "Tu fais du sport ?"])
    expect(result?.turnsAgo).toBe(3)
  })

  it("ignore les questions trop courtes (faux positifs)", () => {
    expect(findRepeatedQuestion("ok ?", ["ok !"])).toBeNull()
  })

  it("ignore les candidats trop courts mais détecte les suivants éligibles", () => {
    const result = findRepeatedQuestion("Quel est ton parcours ?", ["ok", "Quel est ton parcours ?"])
    expect(result?.original).toBe("Quel est ton parcours ?")
  })

  it("respecte un seuil de distance personnalisé", () => {
    // Avec un ratio élevé, une variation d'un mot devient « identique ».
    const result = findRepeatedQuestion("Quel est ton parcours pro", ["Quel est ton parcours"], { maxDistanceRatio: 0.3 })
    expect(result).not.toBeNull()
  })

  it("respecte une longueur minimale personnalisée", () => {
    expect(findRepeatedQuestion("salut", ["salut"], { minLength: 100 })).toBeNull()
  })
})
