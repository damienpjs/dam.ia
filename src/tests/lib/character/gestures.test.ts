import { describe, it, expect } from "vitest"
import { GESTURES, GESTURE_POSES, HAND_SHAPES, gestureFor, mirror } from "@/lib/character/gestures"

describe("lib/character/gestures", () => {
  it("décrit chaque geste par des cibles de main complètes", () => {
    for (const gesture of GESTURES) {
      const pose = GESTURE_POSES[gesture]
      for (const hand of [pose.right, pose.left]) {
        if (!hand) continue
        expect(hand.offset).toHaveLength(3)
        expect(hand.pole).toHaveLength(3)
      }
    }
    expect(GESTURE_POSES.none).toEqual({})
  })

  it("symétrise une main droite en main gauche", () => {
    const left = mirror({ anchor: "chest", offset: [-0.2, 0.1, 0.3], pole: [-0.5, -0.5, 0], twist: 1.5 })
    expect(left).toEqual({ anchor: "chest", offset: [0.2, 0.1, 0.3], pole: [0.5, -0.5, 0], twist: -1.5 })
    expect(mirror({ anchor: "hips", offset: [-1, 0, 0], pole: [0, 0, 0] }).twist).toBeUndefined()
  })

  it("donne à chaque geste une forme de main livrée dans le modèle", () => {
    for (const gesture of GESTURES) {
      const { right, left } = GESTURE_POSES[gesture]
      for (const hand of [right, left]) if (hand?.hand) expect(HAND_SHAPES).toContain(hand.hand)
    }
    // la main au menton touche le visage : elle suit la tête et arrive sans rebond
    expect(GESTURE_POSES.think.right).toMatchObject({ anchor: "head", hand: "chin", contact: true })
    expect(GESTURE_POSES.akimbo.left).toMatchObject({ hand: "hip", contact: true })
  })

  it("garde forme de main et contact en symétrisant", () => {
    const left = mirror({ anchor: "hips", offset: [-0.2, 0, 0], pole: [-1, 0, 0], hand: "hip", contact: true })
    expect(left).toMatchObject({ hand: "hip", contact: true, offset: [0.2, 0, 0] })
  })

  it("garde les gestes à deux mains symétriques", () => {
    for (const gesture of ["shrug", "open", "akimbo"] as const) {
      const { right, left } = GESTURE_POSES[gesture]
      expect(left).toEqual(mirror(right!))
    }
  })

  it("choisit le geste selon l'activité et l'humeur", () => {
    expect(gestureFor("thinking", "neutral")).toBe("think")
    expect(gestureFor("talking", "neutral")).toBe("talk")
    expect(gestureFor("talking", "joy")).toBe("open")
    expect(gestureFor("talking", "surprised")).toBe("open")
    expect(gestureFor("talking", "sorry")).toBe("shrug")
    expect(gestureFor("talking", "proud")).toBe("akimbo")
    expect(gestureFor("listening", "proud")).toBe("akimbo")
    expect(gestureFor("listening", "joy")).toBe("none")
    expect(gestureFor("idle", "neutral")).toBe("none")
  })
})
