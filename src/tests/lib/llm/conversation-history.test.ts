import { describe, it, expect } from "vitest"
import { buildConversationHistory } from "@/lib/llm/conversation-history"
import { MAX_HISTORY_MESSAGES } from "@/constants/llm"
import type { ISessionMessage } from "@/lib/db/chat-service"

/**
 * Fabrique un message de session minimal pour les tests.
 */
function msg(role: "user" | "assistant", content: string, status: "ok" | "error" = "ok"): ISessionMessage {
  return { id: `${role}-${content}`, role, content, status, sources: null, createdAt: new Date() }
}

describe("buildConversationHistory", () => {
  it("retourne un tableau vide quand il n'y a aucun message", () => {
    expect(buildConversationHistory([])).toEqual([])
  })

  it("mappe les messages en {role, content}", () => {
    const result = buildConversationHistory([msg("user", "Salut"), msg("assistant", "Yo")])
    expect(result).toEqual([
      { role: "user", content: "Salut" },
      { role: "assistant", content: "Yo" },
    ])
  })

  it("exclut les réponses de repli (status error)", () => {
    const result = buildConversationHistory([msg("user", "Question"), msg("assistant", "⚠️ Une erreur est survenue.", "error"), msg("user", "Encore"), msg("assistant", "Réponse")])
    expect(result).toEqual([
      { role: "user", content: "Question" },
      { role: "user", content: "Encore" },
      { role: "assistant", content: "Réponse" },
    ])
  })

  it("exclut les messages vides ou blancs", () => {
    const result = buildConversationHistory([msg("user", "  "), msg("assistant", "Réponse")])
    expect(result).toEqual([{ role: "assistant", content: "Réponse" }])
  })

  it("garde l'ancre de début + la fenêtre récente quand la conversation dépasse la fenêtre", () => {
    const many = Array.from({ length: MAX_HISTORY_MESSAGES + 4 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", `m${i}`))
    const result = buildConversationHistory(many)
    expect(result).toHaveLength(MAX_HISTORY_MESSAGES)
    // Ancre (2 par défaut) : les tout premiers messages sont préservés…
    expect(result[0].content).toBe("m0")
    expect(result[1].content).toBe("m1")
    // …et la queue contient bien les plus récents.
    expect(result[result.length - 1].content).toBe(`m${MAX_HISTORY_MESSAGES + 3}`)
  })

  it("préserve la toute première question même dans une longue conversation", () => {
    const many = [msg("user", "Quelle est ma première question ?"), msg("assistant", "Réponse 1"), ...Array.from({ length: MAX_HISTORY_MESSAGES * 2 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", `bavardage ${i}`))]
    const result = buildConversationHistory(many)
    expect(result[0]).toEqual({ role: "user", content: "Quelle est ma première question ?" })
  })

  it("respecte le maxMessages personnalisé en combinant ancre et queue", () => {
    const result = buildConversationHistory([msg("user", "a"), msg("assistant", "b"), msg("user", "c"), msg("assistant", "d")], { maxMessages: 2 })
    // anchorMessages par défaut (2) borné à maxMessages-1 = 1 : ancre [a] + queue [d].
    expect(result).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "d" },
    ])
  })

  it("désactive l'ancre quand anchorMessages vaut 0 (fenêtre purement glissante)", () => {
    const result = buildConversationHistory([msg("user", "a"), msg("assistant", "b"), msg("user", "c"), msg("assistant", "d")], { maxMessages: 2, anchorMessages: 0 })
    expect(result).toEqual([
      { role: "user", content: "c" },
      { role: "assistant", content: "d" },
    ])
  })

  it("tronque les plus anciens au-delà du budget de caractères", () => {
    const result = buildConversationHistory([msg("user", "AAAA"), msg("assistant", "BBBB"), msg("user", "CC")], { maxChars: 5 })
    // En partant du plus récent : "CC" (2) gardé, +"BBBB" → 6 > 5 → on s'arrête.
    expect(result).toEqual([{ role: "user", content: "CC" }])
  })

  it("garde toujours au moins le message le plus récent même s'il dépasse le budget", () => {
    const result = buildConversationHistory([msg("user", "court"), msg("assistant", "x".repeat(50))], { maxChars: 5 })
    expect(result).toEqual([{ role: "assistant", content: "x".repeat(50) }])
  })
})
