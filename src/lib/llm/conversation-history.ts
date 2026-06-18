import type { ISessionMessage } from "@/lib/db/chat-service"
import type { IConversationMessage } from "./types"
import { MAX_HISTORY_MESSAGES, MAX_HISTORY_CHARS } from "@/constants/llm"

/**
 * Options de construction de l'historique (surchargeables pour les tests).
 */
export interface IBuildHistoryOptions {
  /** Nombre maximum de messages conservés (fenêtre glissante). */
  maxMessages?: number
  /** Budget de caractères total au-delà duquel on tronque les plus anciens. */
  maxChars?: number
}

/**
 * Transforme les messages persistés d'une session en historique conversationnel
 * prêt à être envoyé au LLM, en maîtrisant le coût en tokens.
 *
 * Règles appliquées :
 * 1. On exclut les réponses de repli (`status === "error"`) : ce sont des
 *    messages techniques qui n'apportent rien au contexte et pollueraient le ton.
 * 2. On exclut les messages vides.
 * 3. On ne garde que les `maxMessages` plus récents (fenêtre glissante).
 * 4. On tronque ensuite les plus anciens tant que le budget `maxChars` est dépassé.
 *
 * Le contexte RAG n'est volontairement PAS réinjecté : on ne renvoie que le texte
 * « propre » des échanges déjà stockés, pour ne pas re-payer ces tokens à chaque tour.
 *
 * @param messages - Messages de la session triés du plus ancien au plus récent.
 * @returns Historique borné, du plus ancien au plus récent.
 */
export function buildConversationHistory(messages: ISessionMessage[], options: IBuildHistoryOptions = {}): IConversationMessage[] {
  const maxMessages = options.maxMessages ?? MAX_HISTORY_MESSAGES
  const maxChars = options.maxChars ?? MAX_HISTORY_CHARS

  // 1 & 2 : ne garder que les échanges utiles.
  const usable = messages.filter((m) => m.status !== "error" && m.content.trim().length > 0).map<IConversationMessage>((m) => ({ role: m.role, content: m.content }))

  // 3 : fenêtre glissante sur les N plus récents.
  const windowed = usable.slice(-maxMessages)

  // 4 : budget de caractères, en partant des plus récents.
  const kept: IConversationMessage[] = []
  let total = 0
  for (let i = windowed.length - 1; i >= 0; i--) {
    const next = total + windowed[i].content.length
    if (kept.length > 0 && next > maxChars) break
    kept.unshift(windowed[i])
    total = next
  }

  return kept
}
