import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createLLMProvider, getConfiguredProviderNames } from "@/lib/llm"
import { MockProvider } from "@/lib/llm/mock-provider"
import { GeminiProvider } from "@/lib/llm/gemini-provider"
import { GroqProvider } from "@/lib/llm/groq-provider"
import { FallbackProvider } from "@/lib/llm/fallback-provider"

// Mock GeminiProvider pour éviter d'appeler le vrai SDK
vi.mock("@/lib/llm/gemini-provider", () => ({
  GeminiProvider: vi.fn(),
  GEMINI_TIMEOUT_MS: 30_000,
}))

// Mock GroqProvider pour éviter tout appel réseau
vi.mock("@/lib/llm/groq-provider", () => ({
  GroqProvider: vi.fn(),
}))

describe("createLLMProvider", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.LLM_PROVIDER
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
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
    const provider = createLLMProvider()
    expect(GeminiProvider).toHaveBeenCalledWith("auto-detected-key")
    expect(provider).toBeInstanceOf(GeminiProvider)
  })

  it("retourne GroqProvider quand LLM_PROVIDER=groq et GROQ_API_KEY est définie", () => {
    process.env.LLM_PROVIDER = "groq"
    process.env.GROQ_API_KEY = "groq-key"
    createLLMProvider()
    expect(GroqProvider).toHaveBeenCalledWith("groq-key")
  })

  it("lance une erreur quand LLM_PROVIDER=groq sans clé API", () => {
    process.env.LLM_PROVIDER = "groq"
    expect(() => createLLMProvider()).toThrow("GROQ_API_KEY est requis quand LLM_PROVIDER=groq")
  })

  it("auto-détecte Groq seul quand seule GROQ_API_KEY est définie", () => {
    process.env.GROQ_API_KEY = "groq-only"
    const provider = createLLMProvider()
    expect(GroqProvider).toHaveBeenCalledWith("groq-only")
    expect(provider).toBeInstanceOf(GroqProvider)
  })

  it("construit une chaîne de fallback Gemini→Groq quand les deux clés sont présentes", () => {
    process.env.GEMINI_API_KEY = "gem-key"
    process.env.GROQ_API_KEY = "groq-key"
    const provider = createLLMProvider()
    expect(GeminiProvider).toHaveBeenCalledWith("gem-key")
    expect(GroqProvider).toHaveBeenCalledWith("groq-key")
    expect(provider).toBeInstanceOf(FallbackProvider)
  })

  it("fallback sur MockProvider quand LLM_PROVIDER est inconnu", () => {
    process.env.LLM_PROVIDER = "unknown-provider"
    const provider = createLLMProvider()
    expect(provider).toBeInstanceOf(MockProvider)
  })
})

describe("getConfiguredProviderNames", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.LLM_PROVIDER
    delete process.env.GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("retourne une liste vide quand rien n'est configuré", () => {
    expect(getConfiguredProviderNames()).toEqual([])
  })

  it("retourne [gemini] quand gemini est forcé avec sa clé", () => {
    process.env.LLM_PROVIDER = "gemini"
    process.env.GEMINI_API_KEY = "k"
    expect(getConfiguredProviderNames()).toEqual(["gemini"])
  })

  it("retourne [] quand gemini est forcé sans clé", () => {
    process.env.LLM_PROVIDER = "gemini"
    expect(getConfiguredProviderNames()).toEqual([])
  })

  it("retourne [groq] quand groq est forcé avec sa clé", () => {
    process.env.LLM_PROVIDER = "groq"
    process.env.GROQ_API_KEY = "k"
    expect(getConfiguredProviderNames()).toEqual(["groq"])
  })

  it("retourne [] quand groq est forcé sans clé", () => {
    process.env.LLM_PROVIDER = "groq"
    expect(getConfiguredProviderNames()).toEqual([])
  })

  it("retourne [] quand le mode mock est forcé", () => {
    process.env.LLM_PROVIDER = "mock"
    process.env.GEMINI_API_KEY = "k"
    expect(getConfiguredProviderNames()).toEqual([])
  })

  it("auto-détecte gemini seul", () => {
    process.env.GEMINI_API_KEY = "k"
    expect(getConfiguredProviderNames()).toEqual(["gemini"])
  })

  it("auto-détecte groq seul", () => {
    process.env.GROQ_API_KEY = "k"
    expect(getConfiguredProviderNames()).toEqual(["groq"])
  })

  it("auto-détecte la chaîne gemini puis groq quand les deux clés sont présentes", () => {
    process.env.GEMINI_API_KEY = "k1"
    process.env.GROQ_API_KEY = "k2"
    expect(getConfiguredProviderNames()).toEqual(["gemini", "groq"])
  })
})
