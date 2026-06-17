/**
 * Interface commune pour tous les providers LLM.
 * Chaque provider (Gemini, Anthropic, mock...) implémente cette interface.
 */
export interface ILLMProvider {
  /**
   * Envoie un message et retourne un AsyncIterable de chunks de texte.
   * Chaque chunk est une portion de la réponse à streamer vers le client.
   */
  streamResponse(message: string): AsyncIterable<string>
}

/**
 * Types de providers LLM supportés
 */
export type TLLMProviderName = "gemini" | "groq" | "mock"
