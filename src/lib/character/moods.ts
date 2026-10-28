/**
 * Humeurs du personnage 3D et poses de visage associées.
 *
 * Le double IA annonce une humeur en tête de chaque réponse (balise retirée
 * côté serveur, cf. `src/lib/llm/mood-tag.ts`) ; le visage la prend pendant
 * qu'il parle, la garde un moment puis revient vers une écoute détendue.
 *
 * Les poses sont volontairement appuyées : à l'écran, le visage fait une
 * centaine de pixels de haut, une nuance subtile ne se lit pas.
 */

/** Humeurs que le LLM peut annoncer. */
export const MOODS = ["neutral", "joy", "amused", "curious", "surprised", "sorry", "proud"] as const

export type TMood = (typeof MOODS)[number]

export function isMood(value: unknown): value is TMood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value)
}

/** Morph targets sculptés sur le visage (noms des shape keys du .glb). */
export const FACE_MORPHS = ["browInnerUp", "browUp_L", "browUp_R", "browDown_L", "browDown_R", "mouthSmile", "mouthFrown", "smirk_L", "smirk_R", "jawOpen"] as const

export type TFaceMorph = (typeof FACE_MORPHS)[number]

export type TMorphWeights = Record<TFaceMorph, number>

/** Rotation additive de la tête, en radians (tangage, lacet, roulis). */
export interface IHeadOffset {
  pitch: number
  yaw: number
  roll: number
}

/** Ce qu'une humeur impose au visage, avant clignements, regard et parole. */
export interface IFacePose {
  morphs: Partial<TMorphWeights>
  /** Ouverture des paupières supérieures : 0 fermées, 0.86 repos, 1.2 écarquillées. */
  eyeOpen: number
  /** Remontée des paupières inférieures (plissement des joues), 0 à 1. */
  squint: number
  head: IHeadOffset
  /** Décalage du regard propre à l'humeur (unités de l'œil), ajouté aux saccades. */
  gaze?: [number, number]
}

/** Ouverture des yeux au repos : la paupière couvre le haut de l'iris, regard calme. */
export const EYE_OPEN_REST = 0.86

export const NEUTRAL_HEAD: IHeadOffset = { pitch: 0, yaw: 0, roll: 0 }

export const MOOD_POSES: Record<TMood, IFacePose> = {
  neutral: { morphs: { mouthSmile: 0.12 }, eyeOpen: EYE_OPEN_REST, squint: 0.1, head: NEUTRAL_HEAD },
  joy: { morphs: { mouthSmile: 1, browInnerUp: 0.3, browUp_L: 0.3, browUp_R: 0.3 }, eyeOpen: 0.8, squint: 0.7, head: { pitch: -0.06, yaw: 0, roll: 0.07 } },
  amused: { morphs: { smirk_L: 1, mouthSmile: 0.3, browUp_R: 0.75, browDown_L: 0.35 }, eyeOpen: 0.74, squint: 0.5, head: { pitch: 0.02, yaw: 0.08, roll: -0.1 } },
  curious: { morphs: { browUp_L: 0.85, browUp_R: 0.55, browInnerUp: 0.35, mouthSmile: 0.15 }, eyeOpen: 1.02, squint: 0, head: { pitch: 0.04, yaw: -0.05, roll: 0.14 }, gaze: [0, 0.12] },
  surprised: { morphs: { browUp_L: 1, browUp_R: 1, browInnerUp: 0.6, jawOpen: 0.45 }, eyeOpen: 1.2, squint: 0, head: { pitch: -0.09, yaw: 0, roll: 0 } },
  sorry: { morphs: { browInnerUp: 1, mouthFrown: 0.9, browDown_L: 0.15, browDown_R: 0.15 }, eyeOpen: 0.66, squint: 0.1, head: { pitch: 0.14, yaw: 0, roll: 0.08 }, gaze: [0, -0.45] },
  proud: { morphs: { mouthSmile: 0.55, smirk_R: 0.5, browDown_L: 0.35, browDown_R: 0.35 }, eyeOpen: 0.72, squint: 0.4, head: { pitch: -0.12, yaw: 0, roll: 0 } },
}

/** Pose de réflexion (attente du premier token) : un sourcil levé, regard ailleurs. */
export const THINKING_POSE: IFacePose = {
  morphs: { browUp_L: 0.65, browDown_R: 0.45, mouthFrown: 0.2, smirk_R: 0.25 },
  eyeOpen: 0.8,
  squint: 0.2,
  head: { pitch: -0.06, yaw: 0.08, roll: 0.09 },
}

/** Temps pendant lequel l'humeur d'une réponse reste sur le visage après la dernière lettre, en secondes. */
export const MOOD_HOLD_S = 6
