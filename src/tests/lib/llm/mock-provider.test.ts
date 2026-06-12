import { describe, it, expect } from "vitest"
import { MockProvider } from "@/lib/llm/mock-provider"

describe("MockProvider", () => {
  it("streame une réponse pour un message de salutation", async () => {
    const provider = new MockProvider()
    let result = ""

    for await (const char of provider.streamResponse("bonjour")) {
      result += char
    }

    expect(result).toBe("Salut ! 👋 Comment puis-je t'aider ?")
  })

  it("streame la réponse par défaut pour un message inconnu", async () => {
    const provider = new MockProvider()
    let result = ""

    for await (const char of provider.streamResponse("xyz123abc")) {
      result += char
    }

    expect(result).toContain("Damien serait ravi")
  })

  it("streame caractère par caractère", async () => {
    const provider = new MockProvider()
    const chars: string[] = []

    for await (const char of provider.streamResponse("merci")) {
      chars.push(char)
    }

    const fullMessage = chars.join("")
    expect(fullMessage).toContain("plaisir")
    // Chaque yield correspond à un caractère (via for...of sur la string)
    expect(chars.length).toBe([...fullMessage].length)
  })
})
