import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GroqProvider } from "@/lib/llm/groq-provider"
import { QuotaExceededError, ServiceUnavailableError } from "@/lib/llm/errors"
import { GROQ_API_URL, GROQ_MODEL, GROQ_TIMEOUT_MS } from "@/constants/llm"

/**
 * Construit une ligne SSE `data:` à partir d'un delta de contenu.
 */
function sseChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`
}

/**
 * Fabrique une réponse fetch dont le corps streame les morceaux SSE fournis.
 */
function makeStreamResponse(parts: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(part))
      }
      controller.close()
    },
  })
  return { ok: status >= 200 && status < 300, status, body } as unknown as Response
}

describe("GroqProvider", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("streame les deltas de contenu", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("Bonjour "), sseChunk("le "), sseChunk("monde !"), "data: [DONE]\n"]))

    const provider = new GroqProvider("fake-key")
    let result = ""
    for await (const text of provider.streamResponse("test")) {
      result += text
    }

    expect(result).toBe("Bonjour le monde !")
  })

  it("ignore les deltas vides et les lignes non-data", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("Hello"), sseChunk(""), ": commentaire keep-alive\n", "\n", sseChunk(" World")]))

    const provider = new GroqProvider("fake-key")
    const chunks: string[] = []
    for await (const text of provider.streamResponse("test")) {
      chunks.push(text)
    }

    expect(chunks).toEqual(["Hello", " World"])
  })

  it("reconstruit les lignes scindées entre deux morceaux réseau", async () => {
    const full = sseChunk("complet")
    const mid = Math.floor(full.length / 2)
    mockFetch.mockResolvedValue(makeStreamResponse([full.slice(0, mid), full.slice(mid)]))

    const provider = new GroqProvider("fake-key")
    let result = ""
    for await (const text of provider.streamResponse("test")) {
      result += text
    }

    expect(result).toBe("complet")
  })

  it("s'arrête sur le marqueur [DONE]", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("avant"), "data: [DONE]\n", sseChunk("après")]))

    const provider = new GroqProvider("fake-key")
    let result = ""
    for await (const text of provider.streamResponse("test")) {
      result += text
    }

    expect(result).toBe("avant")
  })

  it("transmet le system prompt, le message et le modèle à l'API", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("ok")]))

    const provider = new GroqProvider("ma-cle")
    for await (const _text of provider.streamResponse("Quelles sont tes compétences ?")) {
      // consume stream
    }

    expect(mockFetch).toHaveBeenCalledWith(
      GROQ_API_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer ma-cle" }),
        signal: expect.any(AbortSignal),
      }),
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe(GROQ_MODEL)
    expect(body.stream).toBe(true)
    expect(body.messages[0].role).toBe("system")
    expect(body.messages[1]).toEqual({ role: "user", content: "Quelles sont tes compétences ?" })
  })

  it("insère l'historique conversationnel entre le system prompt et le message courant", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("ok")]))

    const provider = new GroqProvider("ma-cle")
    for await (const _text of provider.streamResponse("Et en TypeScript ?", [
      { role: "user", content: "Tu connais React ?" },
      { role: "assistant", content: "Évidemment 👀" },
    ])) {
      // consume stream
    }

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].role).toBe("system")
    expect(body.messages[1]).toEqual({ role: "user", content: "Tu connais React ?" })
    expect(body.messages[2]).toEqual({ role: "assistant", content: "Évidemment 👀" })
    expect(body.messages[3]).toEqual({ role: "user", content: "Et en TypeScript ?" })
  })

  it("permet de surcharger le modèle", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([sseChunk("ok")]))

    const provider = new GroqProvider("fake-key", "llama-3.1-8b-instant")
    for await (const _text of provider.streamResponse("test")) {
      // consume stream
    }

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe("llama-3.1-8b-instant")
  })

  it("lance une QuotaExceededError sur un statut 429", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([], 429))

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow(QuotaExceededError)
  })

  it("lance une ServiceUnavailableError sur un statut 503", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([], 503))

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow(ServiceUnavailableError)
  })

  it("lance une erreur sur un statut non-2xx", async () => {
    mockFetch.mockResolvedValue(makeStreamResponse([], 500))

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("Erreur API Groq (500)")
  })

  it("lance une erreur quand la réponse n'a pas de corps", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, body: null } as unknown as Response)

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("Réponse Groq sans corps de flux")
  })

  it("lance une erreur de timeout sur AbortError", async () => {
    const abortError = new Error("Aborted")
    abortError.name = "AbortError"
    mockFetch.mockRejectedValue(abortError)

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("La requête a expiré (timeout)")
  })

  it("avorte réellement la requête au-delà du timeout configuré", async () => {
    vi.useFakeTimers()
    // fetch ne résout jamais : il ne rejette que lorsque le signal est avorté.
    mockFetch.mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          const abortError = new Error("Aborted")
          abortError.name = "AbortError"
          reject(abortError)
        })
      })
    })

    const provider = new GroqProvider("fake-key")
    // On attache l'assertion (donc le handler de rejet) AVANT d'avancer les
    // timers, pour qu'aucune fenêtre sans handler n'existe au moment du rejet.
    const assertion = expect(
      (async () => {
        for await (const _text of provider.streamResponse("test")) {
          // consume stream
        }
      })(),
    ).rejects.toThrow("La requête a expiré (timeout)")

    await vi.advanceTimersByTimeAsync(GROQ_TIMEOUT_MS)
    await assertion

    vi.useRealTimers()
  })

  it("propage les autres erreurs", async () => {
    mockFetch.mockRejectedValue(new Error("réseau indisponible"))

    const provider = new GroqProvider("fake-key")
    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("réseau indisponible")
  })
})
