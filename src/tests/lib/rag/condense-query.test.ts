import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { condenseQuery, heuristicCondense, isFollowUp } from "@/lib/rag/condense-query"
import type { IConversationMessage } from "@/lib/llm/types"
import { CONDENSE_MAX_OUTPUT_CHARS, CONDENSE_MODEL, FOLLOW_UP_MAX_WORDS } from "@/constants/rag"

/** Historique minimal : un tour sur un projet précis. */
const HISTORY: IConversationMessage[] = [
  { role: "user", content: "Parle-moi du projet hodl-on-a-minute" },
  { role: "assistant", content: "Une architecture pensée pour la fiabilité et la sécurité avant tout." },
]

/** Fabrique une réponse fetch JSON façon chat completions Groq. */
function makeCompletion(content: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

describe("isFollowUp", () => {
  it("détecte une question courte", () => {
    expect(isFollowUp("C'est quoi le backend ?")).toBe(true)
  })

  it("détecte une question longue portant un marqueur d'anaphore", () => {
    expect(isFollowUp("Et pour la partie déploiement, tu as fait comment concrètement sur ce projet en production ?")).toBe(true)
  })

  it("ne détecte pas une question longue et autonome", () => {
    expect(isFollowUp("Quelles technologies front-end maîtrises-tu le mieux après toutes ces années de développement web ?")).toBe(false)
  })

  it("ignore la casse, les accents et les apostrophes typographiques", () => {
    expect(isFollowUp("À QUOI ça sert exactement dans une application web moderne comme celle-ci ?")).toBe(true)
    expect(isFollowUp("C’est quoi la stack retenue pour ce produit précis livré en production ?")).toBe(true)
  })

  it("retourne false sur un message vide ou blanc", () => {
    expect(isFollowUp("   ")).toBe(false)
  })

  it("respecte le seuil de mots surchargé", () => {
    const sevenWords = "quelles technologies front end maitrises tu vraiment"
    expect(isFollowUp(sevenWords)).toBe(true)
    expect(isFollowUp(sevenWords, { maxWords: 3 })).toBe(false)
  })

  it("utilise FOLLOW_UP_MAX_WORDS par défaut", () => {
    const atLimit = Array.from({ length: FOLLOW_UP_MAX_WORDS }, () => "mot").join(" ")
    const overLimit = Array.from({ length: FOLLOW_UP_MAX_WORDS + 1 }, () => "mot").join(" ")

    expect(isFollowUp(atLimit)).toBe(true)
    expect(isFollowUp(overLimit)).toBe(false)
  })
})

describe("heuristicCondense", () => {
  it("accole la dernière question utilisateur au message courant", () => {
    expect(heuristicCondense("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })

  it("retient la question utilisateur la plus récente", () => {
    const history: IConversationMessage[] = [
      { role: "user", content: "Première question" },
      { role: "assistant", content: "Première réponse" },
      { role: "user", content: "Deuxième question" },
      { role: "assistant", content: "Deuxième réponse" },
    ]

    expect(heuristicCondense("Et après ?", history)).toBe("Deuxième question Et après ?")
  })

  it("retourne le message inchangé si l'historique ne contient aucune question utilisateur", () => {
    const history: IConversationMessage[] = [{ role: "assistant", content: "Message d'accueil" }]

    expect(heuristicCondense("C'est quoi ça ?", history)).toBe("C'est quoi ça ?")
  })
})

describe("condenseQuery", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mockFetch)
    vi.stubEnv("GROQ_API_KEY", "fake-key")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("retourne le message inchangé sans historique", async () => {
    expect(await condenseQuery("C'est quoi le backend ?", [])).toBe("C'est quoi le backend ?")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("retourne le message inchangé si la question est déjà autonome", async () => {
    const question = "Quelles technologies front-end maîtrises-tu le mieux après toutes ces années ?"

    expect(await condenseQuery(question, HISTORY)).toBe(question)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("réécrit une question de suivi via le condenseur", async () => {
    mockFetch.mockResolvedValue(makeCompletion("Quel est le backend du projet hodl-on-a-minute ?"))

    const result = await condenseQuery("C'est quoi le backend ?", HISTORY)

    expect(result).toBe("Quel est le backend du projet hodl-on-a-minute ?")
  })

  it("transmet le modèle, une température nulle et l'historique récent", async () => {
    mockFetch.mockResolvedValue(makeCompletion("Question réécrite ?"))

    await condenseQuery("Et le backend ?", HISTORY)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe(CONDENSE_MODEL)
    expect(body.temperature).toBe(0)
    expect(body.stream).toBeUndefined()
    expect(body.messages[1].content).toContain("hodl-on-a-minute")
    expect(body.messages[1].content).toContain("Et le backend ?")
  })

  it("borne l'historique transmis au condenseur", async () => {
    mockFetch.mockResolvedValue(makeCompletion("Question réécrite ?"))
    const longHistory: IConversationMessage[] = [{ role: "user", content: "Tout premier message" }, ...HISTORY]

    await condenseQuery("Et le backend ?", longHistory, { historyMessages: 2 })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[1].content).not.toContain("Tout premier message")
  })

  it("nettoie les guillemets et le préfixe de la sortie", async () => {
    mockFetch.mockResolvedValue(makeCompletion('  Question réécrite : "Quel est le backend de hodl-on-a-minute ?"  '))

    const result = await condenseQuery("Et le backend ?", HISTORY)

    expect(result).toBe("Quel est le backend de hodl-on-a-minute ?")
  })

  it("retombe sur l'heuristique sans clé Groq", async () => {
    vi.stubEnv("GROQ_API_KEY", "")

    const result = await condenseQuery("C'est quoi le backend ?", HISTORY)

    expect(result).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("retombe sur l'heuristique sur réponse HTTP en erreur", async () => {
    mockFetch.mockResolvedValue(makeCompletion("", 429))

    expect(await condenseQuery("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })

  it("retombe sur l'heuristique si le réseau échoue", async () => {
    mockFetch.mockRejectedValue(new Error("network down"))

    expect(await condenseQuery("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })

  it("retombe sur l'heuristique si le condenseur renvoie du vide", async () => {
    mockFetch.mockResolvedValue(makeCompletion("   "))

    expect(await condenseQuery("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })

  it("retombe sur l'heuristique si le condenseur a répondu au lieu de réécrire", async () => {
    mockFetch.mockResolvedValue(makeCompletion("x".repeat(CONDENSE_MAX_OUTPUT_CHARS + 1)))

    expect(await condenseQuery("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })

  it("retombe sur l'heuristique si la réponse ne contient aucun choix", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as unknown as Response)

    expect(await condenseQuery("C'est quoi le backend ?", HISTORY)).toBe("Parle-moi du projet hodl-on-a-minute C'est quoi le backend ?")
  })
})
