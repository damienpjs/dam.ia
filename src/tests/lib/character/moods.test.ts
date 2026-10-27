import { describe, it, expect } from "vitest"
import { EYE_OPEN_REST, FACE_MORPHS, MOOD_HOLD_S, MOOD_POSES, MOODS, THINKING_POSE, isMood } from "@/lib/character/moods"

describe("lib/character/moods", () => {
  it("reconnaît les humeurs connues et rien d'autre", () => {
    for (const mood of MOODS) expect(isMood(mood)).toBe(true)
    expect(isMood("angry")).toBe(false)
    expect(isMood(42)).toBe(false)
  })

  it("donne une pose à chaque humeur, avec des morphs qui existent dans le modèle", () => {
    for (const mood of MOODS) {
      const pose = MOOD_POSES[mood]
      for (const [name, weight] of Object.entries(pose.morphs)) {
        expect(FACE_MORPHS).toContain(name)
        expect(weight).toBeGreaterThanOrEqual(0)
        expect(weight).toBeLessThanOrEqual(1)
      }
      expect(pose.eyeOpen).toBeGreaterThan(0)
      expect(pose.squint).toBeGreaterThanOrEqual(0)
    }
    for (const name of Object.keys(THINKING_POSE.morphs)) expect(FACE_MORPHS).toContain(name)
  })

  it("garde des expressions lisibles : la joie sourit, la surprise écarquille, le regret fronce", () => {
    expect(MOOD_POSES.joy.morphs.mouthSmile).toBeGreaterThan(0.5)
    expect(MOOD_POSES.surprised.eyeOpen).toBeGreaterThan(EYE_OPEN_REST)
    expect(MOOD_POSES.sorry.morphs.mouthFrown).toBeGreaterThan(0.3)
    expect(MOOD_POSES.sorry.morphs.browInnerUp).toBeGreaterThan(0.5)
  })

  it("tient l'humeur quelques secondes après la réponse", () => {
    expect(MOOD_HOLD_S).toBeGreaterThan(2)
  })
})
