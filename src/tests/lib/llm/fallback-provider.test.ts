import { describe, it, expect } from "vitest"
import { FallbackProvider } from "@/lib/llm/fallback-provider"
import { QuotaExceededError, ServiceUnavailableError } from "@/lib/llm/errors"
import type { ILLMProvider } from "@/lib/llm/types"

/**
 * Provider de test qui émet des morceaux puis, optionnellement, lève une erreur.
 */
function fakeProvider(chunks: string[], throwAfter?: Error): ILLMProvider {
  return {
    async *streamResponse(): AsyncIterable<string> {
      for (const chunk of chunks) {
        yield chunk
      }
      if (throwAfter) {
        throw throwAfter
      }
    },
  }
}

async function collect(provider: ILLMProvider, message = "test"): Promise<string> {
  let result = ""
  for await (const text of provider.streamResponse(message)) {
    result += text
  }
  return result
}

describe("FallbackProvider", () => {
  it("lève une erreur si la liste de providers est vide", () => {
    expect(() => new FallbackProvider([])).toThrow("au moins un provider")
  })

  it("streame la réponse du premier provider quand il réussit", async () => {
    const fallback = new FallbackProvider([fakeProvider(["A", "B"]), fakeProvider(["X"])])
    expect(await collect(fallback)).toBe("AB")
  })

  it("bascule sur le suivant quand le premier dépasse son quota avant tout token", async () => {
    const fallback = new FallbackProvider([fakeProvider([], new QuotaExceededError()), fakeProvider(["secours"])])
    expect(await collect(fallback)).toBe("secours")
  })

  it("propage l'erreur si un token a déjà été émis (pas de bascule à mi-flux)", async () => {
    const fallback = new FallbackProvider([fakeProvider(["déjà "], new QuotaExceededError()), fakeProvider(["secours"])])

    await expect(collect(fallback)).rejects.toThrow(QuotaExceededError)
  })

  it("bascule sur le suivant quand le premier est indisponible (503) avant tout token", async () => {
    const fallback = new FallbackProvider([fakeProvider([], new ServiceUnavailableError()), fakeProvider(["secours"])])
    expect(await collect(fallback)).toBe("secours")
  })

  it("propage la ServiceUnavailableError si un token a déjà été émis", async () => {
    const fallback = new FallbackProvider([fakeProvider(["déjà "], new ServiceUnavailableError()), fakeProvider(["secours"])])

    await expect(collect(fallback)).rejects.toThrow(ServiceUnavailableError)
  })

  it("propage immédiatement une erreur non liée au quota ou à la disponibilité", async () => {
    const fallback = new FallbackProvider([fakeProvider([], new Error("boom")), fakeProvider(["secours"])])

    await expect(collect(fallback)).rejects.toThrow("boom")
  })

  it("propage la QuotaExceededError du dernier provider de la chaîne", async () => {
    const fallback = new FallbackProvider([fakeProvider([], new QuotaExceededError()), fakeProvider([], new QuotaExceededError())])

    await expect(collect(fallback)).rejects.toThrow(QuotaExceededError)
  })

  it("enchaîne plusieurs bascules jusqu'à un provider disponible", async () => {
    const fallback = new FallbackProvider([fakeProvider([], new QuotaExceededError()), fakeProvider([], new QuotaExceededError()), fakeProvider(["enfin"])])

    expect(await collect(fallback)).toBe("enfin")
  })
})
