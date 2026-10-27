import { describe, it, expect } from "vitest"
import { MOOD_DIRECTIVE, createMoodFilter } from "@/lib/llm/mood-tag"
import { MOODS } from "@/lib/character/moods"

function run(chunks: string[]) {
  const filter = createMoodFilter()
  let text = ""
  const moods: string[] = []
  for (const chunk of chunks) {
    const out = filter.push(chunk)
    text += out.text
    if (out.mood) moods.push(out.mood)
  }
  text += filter.flush()
  return { text, moods }
}

describe("lib/llm/mood-tag", () => {
  it("liste toutes les humeurs dans la consigne du LLM", () => {
    for (const mood of MOODS) expect(MOOD_DIRECTIVE).toContain(mood)
  })

  it("retire une balise complète et transmet l'humeur", () => {
    expect(run(["[[mood:joy]] Bonjour !"])).toEqual({ text: "Bonjour !", moods: ["joy"] })
  })

  it("reconstitue une balise coupée entre plusieurs morceaux", () => {
    expect(run(["[[mo", "od:pro", "ud]]", " Fier", " de ça."])).toEqual({ text: "Fier de ça.", moods: ["proud"] })
  })

  it("tolère espaces et majuscules", () => {
    expect(run(["  [[ Mood : Sorry ]]\nDésolé."])).toEqual({ text: "Désolé.", moods: ["sorry"] })
  })

  it("ramène une humeur inconnue à neutral", () => {
    expect(run(["[[mood:furious]] Hum."])).toEqual({ text: "Hum.", moods: ["neutral"] })
  })

  it("laisse passer une réponse sans balise, dès le premier caractère", () => {
    const filter = createMoodFilter()
    expect(filter.push("Salut")).toEqual({ text: "Salut" })
    expect(filter.push(" toi")).toEqual({ text: " toi" })
  })

  it("rend un crochet qui n'ouvrait pas de balise", () => {
    expect(run(["[1] voir la source"])).toEqual({ text: "[1] voir la source", moods: [] })
    expect(run(["[[", "x".repeat(40)])).toEqual({ text: "[[" + "x".repeat(40), moods: [] })
  })

  it("attend la suite d'un début blanc ou d'un « [[ » incomplet", () => {
    const filter = createMoodFilter()
    expect(filter.push("  ")).toEqual({ text: "" })
    expect(filter.push("[[mo")).toEqual({ text: "" })
    expect(filter.flush()).toBe("  [[mo")
    expect(filter.flush()).toBe("")
  })
})
