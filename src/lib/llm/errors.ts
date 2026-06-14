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
