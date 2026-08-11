import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai"
import type { ILLMProvider, IConversationMessage } from "./types"
import { GEMINI_TIMEOUT_MS, GEMINI_THINKING_BUDGET, LLM_MAX_OUTPUT_TOKENS, LLM_TEMPERATURE } from "@/constants/llm"
import { isQuotaExceededError, isServiceUnavailableError, QuotaExceededError, ServiceUnavailableError } from "./errors"
import { buildSystemPrompt } from "./system-prompt"
import { markOperational, markQuotaExceeded } from "./quota-status"

// Réexporté pour compatibilité avec les imports existants.
export { buildSystemPrompt }

/**
 * `thinkingConfig` est accepté par l'API v1beta pour les modèles 2.5 mais absent
 * des types de ce SDK (déprécié au profit de `@google/genai`) : la config est
 * transmise telle quelle dans le corps de la requête, on élargit donc le type.
 */
type TGeminiGenerationConfig = GenerationConfig & {
  thinkingConfig?: { thinkingBudget: number }
}

/**
 * Provider Gemini utilisant le SDK officiel Google.
 * Streame les réponses token par token via l'API Gemini.
 */
export class GeminiProvider implements ILLMProvider {
  private readonly model

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    const generationConfig: TGeminiGenerationConfig = {
      temperature: LLM_TEMPERATURE,
      maxOutputTokens: LLM_MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET },
    }

    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(),
      generationConfig,
    })
  }

  async *streamResponse(message: string, history: IConversationMessage[] = []): AsyncIterable<string> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS)

    try {
      // Gemini attend le rôle "model" pour l'assistant (et non "assistant").
      const contents = [...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), { role: "user", parts: [{ text: message }] }]

      const result = await this.model.generateContentStream(
        {
          contents,
        },
        { signal: abortController.signal },
      )

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          yield text
        }
      }

      // Stream terminé sans erreur : le quota est disponible.
      markOperational("gemini")
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("La requête a expiré (timeout)")
      }
      if (isQuotaExceededError(error)) {
        markQuotaExceeded("gemini")
        throw new QuotaExceededError()
      }
      // 503 / surcharge : erreur transitoire → on laisse le FallbackProvider basculer.
      if (isServiceUnavailableError(error)) {
        throw new ServiceUnavailableError()
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
