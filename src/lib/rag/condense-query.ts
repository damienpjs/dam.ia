import type { IConversationMessage } from "@/lib/llm/types"
import { GROQ_API_URL } from "@/constants/llm"
import { CONDENSE_HISTORY_MESSAGES, CONDENSE_MAX_OUTPUT_CHARS, CONDENSE_MAX_TOKENS, CONDENSE_MODEL, CONDENSE_TIMEOUT_MS, FOLLOW_UP_MAX_WORDS } from "@/constants/rag"

/**
 * Options de condensation (surchargeables pour les tests).
 */
export interface ICondenseQueryOptions {
  /** Nombre de mots sous lequel un message est considéré comme dépendant du contexte. */
  maxWords?: number
  /** Nombre de messages d'historique transmis au condenseur. */
  historyMessages?: number
}

/**
 * Marqueurs d'anaphore : le message renvoie explicitement à quelque chose déjà dit
 * plutôt que de nommer son sujet. Volontairement limité aux tournures franchement
 * déictiques — les pronoms courants (« il », « elle », « it ») apparaissent dans
 * trop de questions autonomes pour servir de signal.
 */
const ANAPHORA_PATTERN =
  /\b(ca|cela|celui|celle|ceux|celles|dedans|dessus|lequel|laquelle|pourquoi|comment|c'est quoi|qu'est ce que c'est|en quoi|a quoi|ce projet|ce truc|ce choix|cette stack|cette techno|du coup|et le|et la|et les|et pour|et en|that|this|these|those|there|why|how come|what about|and the|and for|the same)\b/i

/**
 * Normalise un message pour la détection : minuscules, apostrophes typographiques
 * ramenées à l'apostrophe droite, accents retirés, espaces compactés. Permet à un
 * seul motif de reconnaître « À quoi », « a quoi » et « c'est quoi ».
 */
function normalize(message: string): string {
  return message
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Détecte si un message a besoin du contexte conversationnel pour être compris.
 *
 * Rôle exact : c'est un FILTRE, pas un jugement. Il décide seulement s'il vaut la
 * peine de payer une réécriture — d'où un réglage volontairement large. Un faux
 * positif est peu coûteux (le condenseur renvoie la question inchangée si elle est
 * déjà autonome), là où un faux négatif laisse partir une recherche vectorielle
 * hors-sujet, qui est précisément le bug que l'on corrige.
 *
 * Deux signaux, en OU :
 * 1. Message court : sous ~8 mots, une question s'appuie presque toujours sur ce
 *    qui précède (« et le backend ? », « pourquoi ce choix ? »).
 * 2. Marqueur d'anaphore : le message désigne son sujet au lieu de le nommer.
 */
export function isFollowUp(message: string, options: ICondenseQueryOptions = {}): boolean {
  const maxWords = options.maxWords ?? FOLLOW_UP_MAX_WORDS
  const normalized = normalize(message)
  if (normalized.length === 0) return false

  const wordCount = normalized.split(" ").length
  return wordCount <= maxWords || ANAPHORA_PATTERN.test(normalized)
}

/**
 * Repli sans appel réseau : accole la dernière question du visiteur à la question
 * courante. Grossier, mais suffisant pour remettre les termes du sujet en cours
 * dans le vecteur de recherche — « C'est quoi le backend ? » seul ne pointe vers
 * aucun projet, précédé de « Parle-moi de hodl-on-a-minute » il y pointe.
 *
 * @returns Le message enrichi, ou le message inchangé si l'historique ne contient
 *   aucune question utilisateur.
 */
export function heuristicCondense(message: string, history: IConversationMessage[]): string {
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user")
  return lastUserMessage ? `${lastUserMessage.content} ${message}` : message
}

/**
 * Consigne du condenseur. Le modèle ne doit RIEN répondre à la question : il la
 * réécrit. La règle « si elle est déjà autonome, renvoie-la telle quelle » est ce
 * qui rend le filtre large d'`isFollowUp` inoffensif.
 */
const CONDENSE_SYSTEM_PROMPT = `Tu réécris la question d'un visiteur en une question AUTONOME, compréhensible sans l'historique de conversation.

Règles :
- Remplace les pronoms et les références implicites par ce à quoi ils renvoient dans l'historique
- Si la question est déjà autonome, renvoie-la EXACTEMENT telle quelle
- Conserve la langue d'origine de la question
- Ne réponds JAMAIS à la question, tu ne fais que la reformuler
- Réponds UNIQUEMENT par la question réécrite : pas de guillemets, pas de préambule, pas d'explication`

/**
 * Formate l'historique récent et la question courante pour le condenseur.
 */
function buildCondenseInput(message: string, history: IConversationMessage[], historyMessages: number): string {
  const recent = history.slice(-historyMessages)
  const transcript = recent.map((m) => `${m.role === "user" ? "Visiteur" : "Damien"} : ${m.content}`).join("\n")
  return `Historique :\n${transcript}\n\nQuestion à réécrire : ${message}`
}

/**
 * Nettoie la sortie du condenseur et vérifie qu'elle ressemble bien à une question
 * réécrite. Un modèle qui a répondu au lieu de reformuler produit un texte long :
 * on l'écarte plutôt que d'embedder une réponse à la place d'une question.
 *
 * @returns La question nettoyée, ou `null` si la sortie est inexploitable.
 */
function sanitizeCondensed(raw: string | undefined): string | null {
  if (!raw) return null

  // Le préfixe est retiré ENTRE deux passes de dépouillement des guillemets : le
  // modèle produit aussi bien `"Question : …"` que `Question : "…"`, et une seule
  // passe laisserait les guillemets dans l'un des deux cas.
  const stripQuotes = (text: string): string => text.replace(/^["'«»\s]+|["'«»\s]+$/g, "")
  const cleaned = stripQuotes(stripQuotes(raw.trim()).replace(/^(question(\s+réécrite)?\s*:\s*)/i, "")).trim()

  if (cleaned.length === 0 || cleaned.length > CONDENSE_MAX_OUTPUT_CHARS) return null
  return cleaned
}

/**
 * Réécrit une question de suivi en question autonome, pour la RECHERCHE VECTORIELLE
 * uniquement — le message envoyé au LLM de réponse reste le message original du
 * visiteur.
 *
 * Sans cette étape, « C'est quoi le backend ? » est embeddé isolément : son vecteur
 * ne porte aucune trace du projet dont on parlait, la recherche remonte des extraits
 * sans rapport, et le modèle — à qui l'on présente ces extraits comme faisant
 * autorité — change de sujet. C'est la cause première des ruptures de fil.
 *
 * Stratégie en trois niveaux, du plus précis au plus robuste :
 * 1. Pas d'historique ou question déjà autonome → message inchangé, aucun coût.
 * 2. Réécriture par un petit modèle Groq (rapide, température 0).
 * 3. Clé absente, erreur, timeout ou sortie douteuse → concaténation heuristique.
 *
 * Ne rejette jamais : en pire cas on retombe sur le message d'origine.
 */
export async function condenseQuery(message: string, history: IConversationMessage[], options: ICondenseQueryOptions = {}): Promise<string> {
  if (history.length === 0) return message
  if (!isFollowUp(message, options)) return message

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return heuristicCondense(message, history)

  const historyMessages = options.historyMessages ?? CONDENSE_HISTORY_MESSAGES
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), CONDENSE_TIMEOUT_MS)

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CONDENSE_MODEL,
        temperature: 0,
        max_tokens: CONDENSE_MAX_TOKENS,
        messages: [
          { role: "system", content: CONDENSE_SYSTEM_PROMPT },
          { role: "user", content: buildCondenseInput(message, history, historyMessages) },
        ],
      }),
      signal: abortController.signal,
    })

    if (!response.ok) {
      return heuristicCondense(message, history)
    }

    const parsed = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    return sanitizeCondensed(parsed.choices?.[0]?.message?.content) ?? heuristicCondense(message, history)
  } catch {
    // Timeout, réseau, JSON invalide : la recherche ne doit jamais échouer sur la
    // condensation, qui n'est qu'une amélioration.
    return heuristicCondense(message, history)
  } finally {
    clearTimeout(timeout)
  }
}
