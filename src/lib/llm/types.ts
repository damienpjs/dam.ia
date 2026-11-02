/**
 * Un tour de conversation (mémoire conversationnelle).
 * `content` est le texte « propre » de l'échange : pour un message utilisateur,
 * la version sanitisée SANS contexte RAG (pour ne pas re-payer ces tokens à
 * chaque tour) ; pour un message assistant, la réponse telle qu'affichée.
 */
export interface IConversationMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * Marqueur émis par un provider composite quand il abandonne une réponse déjà
 * entamée pour la reprendre à zéro sur un autre provider : le texte reçu jusque-là
 * doit être jeté.
 */
export const STREAM_RESTART = Symbol("stream-restart")

/** Morceau d'une réponse streamée : du texte, ou le marqueur de reprise. */
export type TStreamPart = string | typeof STREAM_RESTART

/**
 * Interface commune pour tous les providers LLM.
 * Chaque provider (Gemini, Anthropic, mock...) implémente cette interface.
 */
export interface ILLMProvider {
  /**
   * Envoie un message et retourne un AsyncIterable de chunks de texte.
   * Chaque chunk est une portion de la réponse à streamer vers le client.
   *
   * @param message - Le message courant (éventuellement enrichi du contexte RAG)
   * @param history - Tours précédents de la conversation, du plus ancien au plus
   *   récent, hors message courant. Optionnel : un appel sans historique reste
   *   un échange « one-shot » (rétrocompatible).
   */
  streamResponse(message: string, history?: IConversationMessage[]): AsyncIterable<TStreamPart>
}

/**
 * Types de providers LLM supportés
 */
export type TLLMProviderName = "gemini" | "groq" | "mock"
