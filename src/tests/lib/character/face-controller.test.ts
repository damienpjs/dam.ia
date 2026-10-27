import { describe, expect, it } from "vitest"
import { BLINK_CLOSE_S, BLINK_MAX_S, BLINK_OPEN_S, FaceController, type TRandom } from "@/lib/character/face-controller"
import { EYE_OPEN_REST, MOOD_HOLD_S, MOOD_POSES, THINKING_POSE } from "@/lib/character/moods"

/** Suite déterministe : rejoue les valeurs en boucle. */
function sequence(...values: number[]): TRandom {
  let i = 0
  return () => values[i++ % values.length]
}

/** Fait tourner le contrôleur pendant `seconds`, par pas de 1/60 s. */
function run(face: FaceController, seconds: number, each?: () => void) {
  const steps = Math.round(seconds * 60)
  for (let i = 0; i < steps; i++) {
    face.update(1 / 60)
    each?.()
  }
  return face.frame
}

describe("FaceController", () => {
  it("démarre au repos : yeux ouverts, bouche fermée, humeur neutre", () => {
    const face = new FaceController(sequence(0.5))
    expect(face.getActivity()).toBe("idle")
    expect(face.getMood()).toBe("neutral")
    expect(face.frame.eyeOpen).toEqual([EYE_OPEN_REST, EYE_OPEN_REST])
    expect(face.frame.mouthOpen).toBe(0)
  })

  it("cligne des yeux au moins une fois en 6 s, et les rouvre", () => {
    const face = new FaceController(sequence(0.5))
    let minOpen = 1
    run(face, BLINK_MAX_S + 0.5, () => {
      minOpen = Math.min(minOpen, face.frame.eyeOpen[0])
    })
    expect(minOpen).toBeLessThan(0.3)
    run(face, 0.5)
    expect(face.frame.eyeOpen[0]).toBeGreaterThan(0.6)
  })

  it("enchaîne parfois un double clignement", () => {
    // tirages toujours bas : premier clignement à 2,5 s, double clignement réussi
    const face = new FaceController(sequence(0.01))
    let closures = 0
    let closed = false
    run(face, 2.5 + 2 * (BLINK_CLOSE_S + BLINK_OPEN_S) + 0.5, () => {
      const isClosed = face.frame.eyeOpen[0] < 0.4
      if (isClosed && !closed) closures++
      closed = isClosed
    })
    expect(closures).toBeGreaterThanOrEqual(2)
  })

  it("prend la pose de l'humeur reçue et la garde pendant la réponse", () => {
    const face = new FaceController(sequence(0.5))
    face.setActivity("talking")
    face.setMood("joy")
    run(face, 1)
    expect(face.getMood()).toBe("joy")
    expect(face.frame.morphs.mouthSmile).toBeCloseTo(MOOD_POSES.joy.morphs.mouthSmile ?? 0, 1)
    expect(face.frame.squint).toBeCloseTo(MOOD_POSES.joy.squint, 1)
  })

  it("garde l'humeur un moment après la réponse, puis revient au neutre", () => {
    const face = new FaceController(sequence(0.5))
    face.setActivity("talking")
    face.setMood("sorry")
    run(face, 0.5)
    face.setActivity("listening")
    run(face, MOOD_HOLD_S - 1)
    expect(face.getMood()).toBe("sorry")
    run(face, 2)
    expect(face.getMood()).toBe("neutral")
  })

  it("réfléchit : humeur remise à zéro, regard en l'air, pose dédiée", () => {
    const face = new FaceController(sequence(0.5))
    face.setMood("proud")
    face.setActivity("thinking")
    expect(face.getMood()).toBe("neutral")
    run(face, 1)
    expect(face.frame.gaze[0]).toBeGreaterThan(0.4)
    expect(face.frame.gaze[1]).toBeGreaterThan(0.4)
    expect(face.frame.head.pitch).toBeCloseTo(THINKING_POSE.head.pitch, 1)
  })

  it("ignore une activité inchangée", () => {
    const face = new FaceController(sequence(0.5))
    face.setActivity("listening")
    face.setActivity("listening")
    expect(face.getActivity()).toBe("listening")
  })

  it("anime la bouche tant que du texte arrive, et la ferme ensuite", () => {
    const face = new FaceController(sequence(0.5))
    face.setActivity("talking")
    let maxOpen = 0
    run(face, 1, () => {
      face.speak(12)
      maxOpen = Math.max(maxOpen, face.frame.mouthOpen)
    })
    expect(maxOpen).toBeGreaterThan(0.2)
    expect(face.frame.morphs.jawOpen).toBeGreaterThan(0)
    run(face, 1.5)
    expect(face.frame.mouthOpen).toBeLessThan(0.05)
  })

  it("ne bouge pas la bouche hors de la parole", () => {
    const face = new FaceController(sequence(0.5))
    face.setActivity("listening")
    run(face, 1, () => face.speak(40))
    expect(face.frame.mouthOpen).toBe(0)
  })

  it("en écoutant, alterne regard mutuel et brefs détours", () => {
    const face = new FaceController(sequence(0.1, 0.9, 0.3, 0.7, 0.5, 0.2))
    face.setActivity("listening")
    let maxAway = 0
    let backToCamera = false
    run(face, 30, () => {
      const away = Math.hypot(face.frame.gaze[0], face.frame.gaze[1])
      if (away > maxAway) maxAway = away
      if (maxAway > 0.2 && away < 0.06) backToCamera = true
    })
    expect(maxAway).toBeGreaterThan(0.2)
    expect(backToCamera).toBe(true)
  })

  it("utilise Math.random par défaut", () => {
    const face = new FaceController()
    expect(() => run(face, 1)).not.toThrow()
  })
})
