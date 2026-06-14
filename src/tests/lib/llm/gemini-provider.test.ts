import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GeminiProvider, GEMINI_TIMEOUT_MS, buildSystemPrompt } from "@/lib/llm/gemini-provider"
import { QuotaExceededError } from "@/lib/llm/errors"
import { PERSONA } from "@/lib/llm/persona"

// Mock du content-loader pour éviter les accès fichiers dans les tests
vi.mock("@/lib/content-loader", () => ({
  loadFormattedContent: vi.fn(() => "\n\n=== CONTEXTE DOCUMENTAIRE ===\nMock content\n=== FIN ===\n"),
}))

// Mock du SDK Google Generative AI
const mockGenerateContentStream = vi.fn()

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContentStream: mockGenerateContentStream,
        }
      }
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

  it("exporte GEMINI_TIMEOUT_MS", () => {
    expect(GEMINI_TIMEOUT_MS).toBe(30_000)
  })

  describe("buildSystemPrompt", () => {
    it("combine le persona avec le contenu documentaire", () => {
      const result = buildSystemPrompt()

      // Vérifie que le persona est inclus
      expect(result).toContain(PERSONA)
      // Vérifie que le contenu mocké est inclus
      expect(result).toContain("=== CONTEXTE DOCUMENTAIRE ===")
      expect(result).toContain("Mock content")
    })
  })
})
