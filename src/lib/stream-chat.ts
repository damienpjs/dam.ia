import type { TLocale } from "@/constants/i18n"

/**
 * Source RAG reçue de l'API
 */
export interface ISourceInfo {
  label: string
  source: string
  url?: string
}

/**
 * Type pour les chunks reçus de l'API chat
 */
export type TMessageStatus = "ok" | "error"

export type TStreamChunk = {
  content: string
  done: boolean
  sources?: ISourceInfo[]
  sessionId?: string
  messageId?: string
  status?: TMessageStatus
}

/**
 * Résultat retourné à la fin du stream
 */
export interface IStreamResult {
  sources?: ISourceInfo[]
  sessionId?: string
  messageId?: string
  /** Statut de la réponse assistant ("error" pour un repli après échec LLM). */
  status?: TMessageStatus
}

/**
 * Interface pour les options du stream chat
 */
export interface IStreamChatOptions {
  /** Callback appelé à chaque nouveau caractère reçu */
  onChunk: (content: string) => void
  /** Callback appelé quand le stream est terminé */
  onComplete?: (result: IStreamResult) => void
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void
  /** Signal pour annuler la requête */
  signal?: AbortSignal
  /** ID de session existant (pour continuer une conversation) */
  sessionId?: string
  /** Langue sélectionnée dans l'interface : l'assistant y répond dans la même. */
  locale?: TLocale
}

/**
 * Envoie un message à l'API chat et consomme le stream de réponse.
 * Appelle onChunk pour chaque caractère reçu, permettant l'affichage progressif.
 *
 * @param message - Le message utilisateur à envoyer
 * @param options - Options de configuration du stream
 * @returns Promise qui se résout quand le stream est terminé
 *
 * @example
 * ```ts
 * let response = ""
 * await streamChat("Bonjour", {
 *   onChunk: (char) => { response += char },
 *   onComplete: () => console.log("Terminé:", response),
 *   onError: (err) => console.error(err)
 * })
 * ```
 */
export async function streamChat(message: string, options: IStreamChatOptions): Promise<void> {
  const { onChunk, onComplete, onError, signal, sessionId, locale } = options

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId, locale }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error((errorData as { error?: string }).error || `Erreur HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("Impossible de lire le stream de réponse")
    }

    const decoder = new TextDecoder()
    const result: IStreamResult = {}

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n").filter((line) => line.trim())

      for (const line of lines) {
        const chunk = JSON.parse(line) as TStreamChunk
        if (chunk.done) {
          if (chunk.sources) result.sources = chunk.sources
          if (chunk.sessionId) result.sessionId = chunk.sessionId
          if (chunk.messageId) result.messageId = chunk.messageId
          if (chunk.status) result.status = chunk.status
        }
        if (!chunk.done && chunk.content) {
          onChunk(chunk.content)
        }
      }
    }

    onComplete?.(result)
  } catch (error) {
    // Ignorer les erreurs d'annulation
    if (error instanceof Error && error.name === "AbortError") {
      return
    }
    onError?.(error instanceof Error ? error : new Error(String(error)))
  }
}
