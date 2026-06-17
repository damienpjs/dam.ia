import type { ILLMProvider, TLLMProviderName } from "./types"
import { GeminiProvider } from "./gemini-provider"
import { GroqProvider } from "./groq-provider"
import { FallbackProvider } from "./fallback-provider"
import { MockProvider } from "./mock-provider"

/**
 * Crée une instance du provider LLM configuré.
 *
 * Logique de résolution :
 * 1. Si LLM_PROVIDER est défini → utilise explicitement ce provider
 *    (gemini/groq exigent leur clé API respective)
 * 2. Sinon, auto-détection selon les clés présentes, par ordre de priorité
 *    [Gemini, Groq]. Si plusieurs clés existent → FallbackProvider qui bascule
 *    sur le provider suivant quand le quota du précédent est atteint.
 * 3. Sinon → fallback sur le mock
 *
 * @returns Instance du provider LLM
 * @throws Error si le provider explicitement configuré n'a pas de clé API
 */
export function createLLMProvider(): ILLMProvider {
  const providerName = (process.env.LLM_PROVIDER ?? "").toLowerCase() as TLLMProviderName
  const geminiApiKey = process.env.GEMINI_API_KEY
  const groqApiKey = process.env.GROQ_API_KEY

  // Provider explicitement configuré
  if (providerName === "gemini") {
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY est requis quand LLM_PROVIDER=gemini")
    }
    return new GeminiProvider(geminiApiKey)
  }

  if (providerName === "groq") {
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY est requis quand LLM_PROVIDER=groq")
    }
    return new GroqProvider(groqApiKey)
  }

  if (providerName === "mock") {
    return new MockProvider()
  }

  // Auto-détection : chaîne de providers par ordre de priorité.
  const chain: ILLMProvider[] = []
  if (geminiApiKey) chain.push(new GeminiProvider(geminiApiKey))
  if (groqApiKey) chain.push(new GroqProvider(groqApiKey))

  if (chain.length === 1) {
    return chain[0]
  }
  if (chain.length > 1) {
    return new FallbackProvider(chain)
  }

  // Fallback sur le mock
  return new MockProvider()
}

/**
 * Retourne les providers actifs (avec leur clé renseignée), dans le même ordre
 * de priorité que `createLLMProvider`. Sert à savoir quelles pastilles de
 * statut afficher : un seul provider si forcé/seul, les deux si la chaîne de
 * fallback est active, aucun en mode mock.
 */
export function getConfiguredProviderNames(): TLLMProviderName[] {
  const providerName = (process.env.LLM_PROVIDER ?? "").toLowerCase() as TLLMProviderName
  const geminiApiKey = process.env.GEMINI_API_KEY
  const groqApiKey = process.env.GROQ_API_KEY

  if (providerName === "gemini") return geminiApiKey ? ["gemini"] : []
  if (providerName === "groq") return groqApiKey ? ["groq"] : []
  if (providerName === "mock") return []

  const names: TLLMProviderName[] = []
  if (geminiApiKey) names.push("gemini")
  if (groqApiKey) names.push("groq")
  return names
}

export type { ILLMProvider, TLLMProviderName }
export { GeminiProvider } from "./gemini-provider"
export { GroqProvider } from "./groq-provider"
export { FallbackProvider } from "./fallback-provider"
export { MockProvider } from "./mock-provider"
