import { describe, it, expect, beforeEach } from "vitest"
import { characterSpeaks, readCharacterCues, resetCharacterCues, setCharacterActivity, setCharacterMood } from "@/lib/character/character-cues"

describe("lib/character/character-cues", () => {
  beforeEach(() => resetCharacterCues())

  it("part au repos", () => {
    expect(readCharacterCues()).toEqual({ activity: "idle", mood: "neutral", pendingSpeech: 0, moodVersion: 0, speech: 0 })
  })

  it("transmet l'activité et versionne chaque humeur, même répétée", () => {
    setCharacterActivity("thinking")
    setCharacterMood("joy")
    setCharacterMood("joy")
    const cues = readCharacterCues()
    expect(cues.activity).toBe("thinking")
    expect(cues.mood).toBe("joy")
    expect(cues.moodVersion).toBe(2)
  })

  it("cumule le texte reçu entre deux lectures, puis le vide", () => {
    characterSpeaks("Bon")
    characterSpeaks("jour")
    expect(readCharacterCues().speech).toBe(7)
    expect(readCharacterCues().speech).toBe(0)
  })
})
