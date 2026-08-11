import type { ILLMProvider, IConversationMessage } from "./types"
import { GROQ_API_URL, GROQ_MODEL, GROQ_TIMEOUT_MS, LLM_MAX_OUTPUT_TOKENS, LLM_TEMPERATURE } from "@/constants/llm"
import { isQuotaExceededError, isServiceUnavailableError, QuotaExceededError, ServiceUnavailableError } from "./errors"
import { buildSystemPrompt } from "./system-prompt"
import { markOperational, markQuotaExceeded } from "./quota-status"

/**
 * Provider Groq utilisant l'API chat completions compatible OpenAI.
 * Streame les réponses token par token via le flux SSE (`stream: true`).
 *
 * Sert de fallback lorsque le quota du provider primaire (Gemini) est atteint :
 * Groq dispose d'un quota gratuit indépendant.
 */
export class GroqProvider implements ILLMProvider {
  private readonly apiKey: string
  private readonly model: string

  constructor(apiKey: string, model: string = GROQ_MODEL) {
    this.apiKey = apiKey
    this.model = model
  }

  async *streamResponse(message: string, history: IConversationMessage[] = []): AsyncIterable<string> {
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), GROQ_TIMEOUT_MS)

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          temperature: LLM_TEMPERATURE,
          max_tokens: LLM_MAX_OUTPUT_TOKENS,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: message },
          ],
        }),
        signal: abortController.signal,
      })

      if (response.status === 429) {
        throw new QuotaExceededError()
      }
      // 503 : surcharge transitoire → erreur dédiée pour permettre la bascule.
      if (response.status === 503) {
        throw new ServiceUnavailableError()
      }
      if (!response.ok) {
        throw new Error(`Erreur API Groq (${response.status})`)
      }
      if (!response.body) {
        throw new Error("Réponse Groq sans corps de flux")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let finished = false

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        // La dernière ligne peut être incomplète : on la garde pour le prochain chunk.
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue

          const data = trimmed.slice(5).trim()
          if (data === "[DONE]") {
            finished = true
            break
          }

          try {
            const parsed = JSON.parse(data)
            const text: string | undefined = parsed.choices?.[0]?.delta?.content
            if (text) {
              yield text
            }
          } catch {
            // Ligne partielle ou non-JSON : on ignore.
          }
        }
      }

      // Stream terminé sans erreur : le quota est disponible.
      markOperational("groq")
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("La requête a expiré (timeout)")
      }
      if (isQuotaExceededError(error)) {
        markQuotaExceeded("groq")
        throw new QuotaExceededError()
      }
      if (isServiceUnavailableError(error)) {
        throw new ServiceUnavailableError()
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
