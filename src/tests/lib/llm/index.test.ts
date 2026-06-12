import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createLLMProvider } from "@/lib/llm"
import { MockProvider } from "@/lib/llm/mock-provider"
import { GeminiProvider } from "@/lib/llm/gemini-provider"

// Mock GeminiProvider pour éviter d'appeler le vrai SDK
vi.mock("@/lib/llm/gemini-provider", () => ({
  GeminiProvider: vi.fn(),
  GEMINI_TIMEOUT_MS: 30_000,
}))

describe("createLLMProvider", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.LLM_PROVIDER
    delete process.env.GEMINI_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("retourne MockProvider quand aucune variable n'est définie", () => {
    const provider = createLLMProvider()
    expect(provider).toBeInstanceOf(MockProvider)
  })

  it("retourne MockProvider quand LLM_PROVIDER=mock", () => {
    process.env.LLM_PROVIDER = "mock"
    const provider = createLLMProvider()
    expect(provider).toBeInstanceOf(MockProvider)
  })

  it("retourne GeminiProvider quand LLM_PROVIDER=gemini et GEMINI_API_KEY est définie", () => {
    process.env.LLM_PROVIDER = "gemini"
    process.env.GEMINI_API_KEY = "fake-key"
    createLLMProvider()
    expect(GeminiProvider).toHaveBeenCalledWith("fake-key")
  })

  it("lance une erreur quand LLM_PROVIDER=gemini sans clé API", () => {
    process.env.LLM_PROVIDER = "gemini"
    expect(() => createLLMProvider()).toThrow("GEMINI_API_KEY est requis quand LLM_PROVIDER=gemini")
  })

  it("auto-détecte Gemini quand GEMINI_API_KEY est définie sans LLM_PROVIDER", () => {
    process.env.GEMINI_API_KEY = "auto-detected-key"
    createLLMProvider()
    expect(GeminiProvider).toHaveBeenCalledWith("auto-detected-key")
  })

  it("fallback sur MockProvider quand LLM_PROVIDER est inconnu", () => {
    process.env.LLM_PROVIDER = "unknown-provider"
    const provider = createLLMProvider()
    expect(provider).toBeInstanceOf(MockProvider)
  })
})
