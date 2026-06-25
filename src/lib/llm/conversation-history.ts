import type { ISessionMessage } from "@/lib/db/chat-service"
import type { IConversationMessage } from "./types"
import { MAX_HISTORY_MESSAGES, MAX_HISTORY_CHARS, HISTORY_ANCHOR_MESSAGES } from "@/constants/llm"

/**
 * Options de construction de l'historique (surchargeables pour les tests).
 */
export interface IBuildHistoryOptions {
  /** Nombre maximum de messages conservés (fenêtre glissante récente). */
  maxMessages?: number
  /** Budget de caractères total au-delà duquel on tronque les plus anciens. */
  maxChars?: number
  /** Nombre de messages de début toujours conservés (ancre). 0 désactive l'ancre. */
  anchorMessages?: number
}

/**
 * Tronque les plus anciens messages tant que le budget de caractères est dépassé,
 * en partant des plus récents. Garde toujours au moins le message le plus récent.
 */
function applyCharBudget(messages: IConversationMessage[], maxChars: number): IConversationMessage[] {
  const kept: IConversationMessage[] = []
  let total = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const next = total + messages[i].content.length
    if (kept.length > 0 && next > maxChars) break
    kept.unshift(messages[i])
    total = next
  }
  return kept
}

/**
 * Transforme les messages persistés d'une session en historique conversationnel
 * prêt à être envoyé au LLM, en maîtrisant le coût en tokens.
 *
 * Stratégie « tête + queue » :
 * 1. On exclut les réponses de repli (`status === "error"`) : ce sont des
 *    messages techniques qui n'apportent rien au contexte et pollueraient le ton.
 * 2. On exclut les messages vides.
 * 3. Si tout tient dans la fenêtre, on garde tout (sous réserve du budget chars).
 * 4. Sinon on combine une ANCRE (les `anchorMessages` tout premiers messages) avec
 *    la fenêtre récente (les plus récents). Une fenêtre purement glissante finit
 *    par oublier le début de la conversation : on perdrait alors la trace de la
 *    première question (« quelle était ma première question ? »), d'autant plus
 *    après un reload où l'on accumule davantage de messages.
 * 5. On tronque ensuite les plus anciens de la queue tant que le budget `maxChars`
 *    est dépassé. L'ancre, petite et bornée, est toujours préservée.
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
  const anchorMessages = options.anchorMessages ?? HISTORY_ANCHOR_MESSAGES

  // 1 & 2 : ne garder que les échanges utiles.
  const usable = messages.filter((m) => m.status !== "error" && m.content.trim().length > 0).map<IConversationMessage>((m) => ({ role: m.role, content: m.content }))

  // 3 : tout tient dans la fenêtre → rien à ancrer, simple budget de caractères.
  if (usable.length <= maxMessages) {
    return applyCharBudget(usable, maxChars)
  }

  // 4 : ancre de début + queue récente, sans chevauchement.
  // On borne l'ancre pour toujours laisser au moins un message à la queue.
  const anchorCount = Math.min(Math.max(anchorMessages, 0), maxMessages - 1)
  const anchor = usable.slice(0, anchorCount)
  const tail = usable.slice(-(maxMessages - anchorCount))

  // 5 : budget de caractères appliqué à la seule queue ; l'ancre reste intacte.
  return [...anchor, ...applyCharBudget(tail, maxChars)]
}
