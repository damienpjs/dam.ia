import { INJECTION_PATTERNS, MAX_MESSAGE_LENGTH } from "@/constants/validation"

export { MAX_MESSAGE_LENGTH }

type TSanitizeResult = {
  sanitized: string
  injectionDetected: boolean
}

/**
 * Analyse un message utilisateur et détecte les tentatives de prompt injection.
 *
 * - Si une injection est détectée, le message est préfixé d'un tag `[INJECTION DETECTED]`
 *   pour que le LLM applique ses consignes de sécurité.
 * - Les messages trop longs sont tronqués.
 */
export function sanitizeMessage(message: string): TSanitizeResult {
  let sanitized = message.trim()

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH)
  }

  const injectionDetected = INJECTION_PATTERNS.some((pattern) => pattern.test(sanitized))

  if (injectionDetected) {
    sanitized = `[INJECTION DETECTED] ${sanitized}`
  }

  return { sanitized, injectionDetected }
}
