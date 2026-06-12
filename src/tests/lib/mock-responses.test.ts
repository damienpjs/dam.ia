import { describe, it, expect } from "vitest"
import { getMockResponse, DEFAULT_MOCK_RESPONSE } from "@/lib/mock-responses"

describe("getMockResponse", () => {
  it("retourne la réponse de bienvenue pour 'bonjour'", () => {
    const response = getMockResponse("bonjour")
    expect(response).toBe("Salut ! 👋 Comment puis-je t'aider ?")
  })

  it("est insensible à la casse", () => {
    expect(getMockResponse("Bonjour")).toBe("Salut ! 👋 Comment puis-je t'aider ?")
    expect(getMockResponse("SALUT")).toBe("Salut ! 👋 Comment puis-je t'aider ?")
  })

  it("reconnaît 'salut'", () => {
    expect(getMockResponse("salut")).toBe("Salut ! 👋 Comment puis-je t'aider ?")
  })

  it("reconnaît 'hello'", () => {
    expect(getMockResponse("hello")).toBe("Salut ! 👋 Comment puis-je t'aider ?")
  })

  it("reconnaît les questions sur les compétences", () => {
    const response = getMockResponse("Quelles sont tes compétences ?")
    expect(response).toContain("Next.js")
  })

  it("reconnaît les questions sur les projets", () => {
    const response = getMockResponse("Parle-moi de tes projets")
    expect(response).toContain("React")
  })

  it("reconnaît les questions sur le travail/recrutement", () => {
    const response = getMockResponse("Tu es disponible pour un emploi ?")
    expect(response).toContain("Lead Tech")
  })

  it("reconnaît les questions sur l'expérience", () => {
    const response = getMockResponse("Quel est ton parcours ?")
    expect(response).toContain("React")
  })

  it("reconnaît les remerciements", () => {
    const response = getMockResponse("merci")
    expect(response).toContain("plaisir")
  })

  it("reconnaît les au revoir", () => {
    const response = getMockResponse("au revoir")
    expect(response).toContain("bientôt")
  })

  it("reconnaît les demandes d'aide", () => {
    const response = getMockResponse("j'ai besoin d'aide")
    expect(response).toContain("Damien")
  })

  it("reconnaît les questions sur 'qui es-tu'", () => {
    const response = getMockResponse("qui es-tu ?")
    expect(response).toContain("Lead Tech JS")
  })

  it("reconnaît les questions 'comment ça va'", () => {
    const response = getMockResponse("comment ça va ?")
    expect(response).toContain("bien")
  })

  it("retourne la réponse par défaut pour une entrée inconnue", () => {
    expect(getMockResponse("qwerty123456789")).toBe(DEFAULT_MOCK_RESPONSE)
  })

  it("retourne la réponse par défaut pour une chaîne vide", () => {
    expect(getMockResponse("")).toBe(DEFAULT_MOCK_RESPONSE)
  })

  it("retourne la réponse par défaut pour une chaîne d'espaces", () => {
    expect(getMockResponse("   ")).toBe(DEFAULT_MOCK_RESPONSE)
  })
})
