import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { streamChat, type TStreamChunk } from "@/lib/stream-chat"

/**
 * Helper pour créer un ReadableStream mockée à partir de chunks
 */
function createMockStream(chunks: TStreamChunk[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = chunks[index]
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"))
        index++
      } else {
        controller.close()
      }
    },
  })
}

/**
 * Helper pour créer une Response mockée avec stream
 */
function createMockResponse(chunks: TStreamChunk[], status = 200): Response {
  return new Response(createMockStream(chunks), {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

describe("streamChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("appelle fetch avec les bons paramètres", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      createMockResponse([
        { content: "H", done: false },
        { content: "i", done: false },
        { content: "", done: true },
      ]),
    )
    vi.stubGlobal("fetch", mockFetch)

    await streamChat("Bonjour", { onChunk: vi.fn() })

    expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Bonjour", sessionId: undefined }),
      signal: undefined,
    })
  })

  it("appelle onChunk pour chaque caractère reçu", async () => {
    const chunks: TStreamChunk[] = [
      { content: "S", done: false },
      { content: "a", done: false },
      { content: "l", done: false },
      { content: "u", done: false },
      { content: "t", done: false },
      { content: "", done: true },
    ]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    const onChunk = vi.fn()
    await streamChat("test", { onChunk })

    expect(onChunk).toHaveBeenCalledTimes(5)
    expect(onChunk).toHaveBeenNthCalledWith(1, "S")
    expect(onChunk).toHaveBeenNthCalledWith(2, "a")
    expect(onChunk).toHaveBeenNthCalledWith(3, "l")
    expect(onChunk).toHaveBeenNthCalledWith(4, "u")
    expect(onChunk).toHaveBeenNthCalledWith(5, "t")
  })

  it("appelle onComplete quand le stream est terminé", async () => {
    const chunks: TStreamChunk[] = [
      { content: "A", done: false },
      { content: "", done: true },
    ]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    const onComplete = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onComplete })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({})
  })

  it("transmet les sources RAG via onComplete", async () => {
    const sources = [
      { label: "CV", source: "cv" },
      { label: "Apizee", source: "experience-apizee" },
    ]
    const chunks: TStreamChunk[] = [
      { content: "Réponse", done: false },
      { content: "", done: true, sources },
    ]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    const onComplete = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onComplete })

    expect(onComplete).toHaveBeenCalledWith({ sources })
  })

  it("transmet le sessionId et messageId via onComplete", async () => {
    const chunks: TStreamChunk[] = [
      { content: "Ok", done: false },
      { content: "", done: true, sessionId: "sess-123", messageId: "msg-456" },
    ]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    const onComplete = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onComplete })

    expect(onComplete).toHaveBeenCalledWith({ sessionId: "sess-123", messageId: "msg-456" })
  })

  it("envoie le sessionId dans la requête fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse([{ content: "", done: true }]))
    vi.stubGlobal("fetch", mockFetch)

    await streamChat("test", { onChunk: vi.fn(), sessionId: "sess-abc" })

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        body: JSON.stringify({ message: "test", sessionId: "sess-abc" }),
      }),
    )
  })

  it("appelle onError en cas d'erreur HTTP", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Message requis" }), { status: 400, headers: { "Content-Type": "application/json" } })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse))

    const onError = vi.fn()
    await streamChat("", { onChunk: vi.fn(), onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onError.mock.calls[0][0].message).toBe("Message requis")
  })

  it("appelle onError en cas d'erreur HTTP sans body JSON", async () => {
    const errorResponse = new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse))

    const onError = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe("Erreur HTTP 500")
  })

  it("appelle onError si le body est null", async () => {
    const response = new Response(null, { status: 200 })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))

    const onError = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe("Impossible de lire le stream de réponse")
  })

  it("appelle onError en cas d'erreur réseau", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")))

    const onError = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toBe("Network error")
  })

  it("ignore les erreurs d'annulation (AbortError)", async () => {
    const abortError = new Error("Aborted")
    abortError.name = "AbortError"

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError))

    const onError = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onError })

    expect(onError).not.toHaveBeenCalled()
  })

  it("passe le signal d'annulation à fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse([{ content: "", done: true }]))
    vi.stubGlobal("fetch", mockFetch)

    const controller = new AbortController()
    await streamChat("test", {
      onChunk: vi.fn(),
      signal: controller.signal,
    })

    expect(mockFetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ signal: controller.signal }))
  })

  it("ne fait rien pour les chunks done:true", async () => {
    const chunks: TStreamChunk[] = [
      { content: "A", done: false },
      { content: "", done: true },
    ]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    const onChunk = vi.fn()
    await streamChat("test", { onChunk })

    // Seulement "A", pas le chunk final
    expect(onChunk).toHaveBeenCalledTimes(1)
    expect(onChunk).toHaveBeenCalledWith("A")
  })

  it("reconstruit correctement un message complet", async () => {
    const message = "Salut ! 👋"
    const chunks: TStreamChunk[] = [...message.split("").map((char) => ({ content: char, done: false })), { content: "", done: true }]

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse(chunks)))

    let result = ""
    await streamChat("test", {
      onChunk: (char) => {
        result += char
      },
    })

    expect(result).toBe(message)
  })

  it("gère les erreurs non-Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("string error"))

    const onError = vi.fn()
    await streamChat("test", { onChunk: vi.fn(), onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe("string error")
  })
})
