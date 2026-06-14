import type { ILLMProvider, TLLMProviderName } from "./types"
import { GeminiProvider } from "./gemini-provider"
import { MockProvider } from "./mock-provider"

/**
 * Crée une instance du provider LLM configuré.
 *
 * Logique de résolution :
 * 1. Si LLM_PROVIDER est défini → utilise ce provider
 * 2. Si GEMINI_API_KEY est défini → utilise Gemini
 * 3. Sinon → fallback sur le mock
 *
 * @returns Instance du provider LLM
 * @throws Error si le provider configuré n'a pas de clé API
 */
export function createLLMProvider(): ILLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "").toLowerCase() as TLLMProviderName
  const geminiApiKey = process.env.GEMINI_API_KEY

  // Provider explicitement configuré
  if (providerName === "gemini") {
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY est requis quand LLM_PROVIDER=gemini")
    }
    return new GeminiProvider(geminiApiKey)
  }

  if (providerName === "mock") {
    return new MockProvider()
  }

  // Auto-détection : si une clé Gemini est présente, l'utiliser
  if (geminiApiKey) {
    return new GeminiProvider(geminiApiKey)
  }

  // Fallback sur le mock
  return new MockProvider()
}

export type { ILLMProvider, TLLMProviderName }
export { GeminiProvider } from "./gemini-provider"
export { MockProvider } from "./mock-provider"
