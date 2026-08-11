import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GeminiProvider, buildSystemPrompt } from "@/lib/llm/gemini-provider"
import { QuotaExceededError, ServiceUnavailableError } from "@/lib/llm/errors"
import { PERSONA, GEMINI_TIMEOUT_MS, GEMINI_THINKING_BUDGET, LLM_MAX_OUTPUT_TOKENS, LLM_TEMPERATURE } from "@/constants/llm"

// Mock du pipeline RAG pour éviter les appels réseau dans les tests
vi.mock("@/lib/rag/pipeline", () => ({
  retrieveRelevantChunks: vi.fn(() => Promise.resolve([])),
  formatRAGContext: vi.fn(() => ""),
}))

// Mock du SDK Google Generative AI
const mockGenerateContentStream = vi.fn()

const mockGetGenerativeModel = vi.fn(() => ({ generateContentStream: mockGenerateContentStream }))

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel
    },
  }
})

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("streame les chunks de texte de Gemini", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "Bonjour " }
        yield { text: () => "le " }
        yield { text: () => "monde !" }
      })(),
    })

    const provider = new GeminiProvider("fake-api-key")
    let result = ""

    for await (const text of provider.streamResponse("test")) {
      result += text
    }

    expect(result).toBe("Bonjour le monde !")
  })

  it("ignore les chunks vides", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "Hello" }
        yield { text: () => "" }
        yield { text: () => " World" }
      })(),
    })

    const provider = new GeminiProvider("fake-api-key")
    const chunks: string[] = []

    for await (const text of provider.streamResponse("test")) {
      chunks.push(text)
    }

    expect(chunks).toEqual(["Hello", " World"])
  })

  it("transmet le message utilisateur à l'API", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "ok" }
      })(),
    })

    const provider = new GeminiProvider("fake-api-key")

    for await (const _text of provider.streamResponse("Quelles sont tes compétences ?")) {
      // consume stream
    }

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      {
        contents: [{ role: "user", parts: [{ text: "Quelles sont tes compétences ?" }] }],
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it("transmet l'historique conversationnel avec le rôle 'model' pour l'assistant", async () => {
    mockGenerateContentStream.mockResolvedValue({
      stream: (async function* () {
        yield { text: () => "ok" }
      })(),
    })

    const provider = new GeminiProvider("fake-api-key")

    for await (const _text of provider.streamResponse("Et en TypeScript ?", [
      { role: "user", content: "Tu connais React ?" },
      { role: "assistant", content: "Évidemment 👀" },
    ])) {
      // consume stream
    }

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      {
        contents: [
          { role: "user", parts: [{ text: "Tu connais React ?" }] },
          { role: "model", parts: [{ text: "Évidemment 👀" }] },
          { role: "user", parts: [{ text: "Et en TypeScript ?" }] },
        ],
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it("lance une erreur de timeout sur AbortError", async () => {
    const abortError = new Error("Aborted")
    abortError.name = "AbortError"
    mockGenerateContentStream.mockRejectedValue(abortError)

    const provider = new GeminiProvider("fake-api-key")

    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("La requête a expiré (timeout)")
  })

  it("propage les autres erreurs", async () => {
    mockGenerateContentStream.mockRejectedValue(new Error("API key invalid"))

    const provider = new GeminiProvider("fake-api-key")

    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow("API key invalid")
  })

  it("lance une QuotaExceededError sur erreur 429", async () => {
    mockGenerateContentStream.mockRejectedValue(new Error("[429 Too Many Requests] You exceeded your current quota"))

    const provider = new GeminiProvider("fake-api-key")

    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow(QuotaExceededError)
  })

  it("lance une ServiceUnavailableError sur erreur 503", async () => {
    mockGenerateContentStream.mockRejectedValue(new Error("[503 Service Unavailable] This model is currently experiencing high demand"))

    const provider = new GeminiProvider("fake-api-key")

    await expect(async () => {
      for await (const _text of provider.streamResponse("test")) {
        // consume stream
      }
    }).rejects.toThrow(ServiceUnavailableError)
  })

  it("exporte GEMINI_TIMEOUT_MS", () => {
    expect(GEMINI_TIMEOUT_MS).toBe(30_000)
  })

  it("configure la génération : température, plafond de sortie et thinking désactivé", () => {
    new GeminiProvider("fake-api-key")

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: LLM_TEMPERATURE,
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET },
        },
      }),
    )
  })

  it("laisse la place à la réponse malgré le plafond de sortie", () => {
    // Les tokens de raisonnement sont décomptés de maxOutputTokens : un budget de
    // thinking non nul avec un plafond serré tronquerait la réponse.
    expect(GEMINI_THINKING_BUDGET).toBe(0)
    expect(LLM_MAX_OUTPUT_TOKENS).toBeGreaterThan(0)
  })

  describe("buildSystemPrompt", () => {
    it("combine la date du jour avec le persona", () => {
      const result = buildSystemPrompt()

      // Vérifie que le persona est inclus
      expect(result).toContain(PERSONA)
      // Vérifie que la date du jour est incluse
      expect(result).toContain("Date du jour :")
    })
  })
})
