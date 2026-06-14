/**
 * Type pour les chunks reçus de l'API chat
 */
export type TStreamChunk = {
  content: string
  done: boolean
}

/**
 * Interface pour les options du stream chat
 */
export interface IStreamChatOptions {
  /** Callback appelé à chaque nouveau caractère reçu */
  onChunk: (content: string) => void
  /** Callback appelé quand le stream est terminé */
  onComplete?: () => void
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void
  /** Signal pour annuler la requête */
  signal?: AbortSignal
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
  const { onChunk, onComplete, onError, signal } = options

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
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

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n").filter((line) => line.trim())

      for (const line of lines) {
        const chunk = JSON.parse(line) as TStreamChunk
        if (!chunk.done && chunk.content) {
          onChunk(chunk.content)
        }
      }
    }

    onComplete?.()
  } catch (error) {
    // Ignorer les erreurs d'annulation
    if (error instanceof Error && error.name === "AbortError") {
      return
    }
    onError?.(error instanceof Error ? error : new Error(String(error)))
  }
}
