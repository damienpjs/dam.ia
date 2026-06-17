import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ILLMProvider } from "./types"
import { GEMINI_TIMEOUT_MS } from "@/constants/llm"
import { isQuotaExceededError, QuotaExceededError } from "./errors"
import { buildSystemPrompt } from "./system-prompt"
import { markOperational, markQuotaExceeded } from "./quota-status"

// Réexporté pour compatibilité avec les imports existants.
export { buildSystemPrompt }

/**
 * Provider Gemini utilisant le SDK officiel Google.
 * Streame les réponses token par token via l'API Gemini.
 */
export class GeminiProvider implements ILLMProvider {
  private readonly model

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(),
    })
  }

  async *streamResponse(message: string): AsyncIterable<string> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS)

    try {
      const result = await this.model.generateContentStream(
        {
          contents: [{ role: "user", parts: [{ text: message }] }],
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
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
