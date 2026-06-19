export class QuotaExceededError extends Error {
  constructor(message = "Quota API dépassé") {
    super(message)
    this.name = "QuotaExceededError"
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof QuotaExceededError) return true
  if (error instanceof Error) {
    return error.message.includes("429") || error.message.includes("quota")
  }
  return false
}

/**
 * Erreur transitoire côté fournisseur (HTTP 503) : modèle surchargé /
 * temporairement indisponible. Distincte du quota (429) : elle déclenche elle
 * aussi une bascule du `FallbackProvider`, mais traduit un pic de demande
 * passager plutôt qu'un plafond d'usage atteint.
 */
export class ServiceUnavailableError extends Error {
  constructor(message = "Service LLM temporairement indisponible") {
    super(message)
    this.name = "ServiceUnavailableError"
  }
}

export function isServiceUnavailableError(error: unknown): boolean {
  if (error instanceof ServiceUnavailableError) return true
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes("503") || message.includes("overloaded") || message.includes("unavailable")
  }
  return false
}
