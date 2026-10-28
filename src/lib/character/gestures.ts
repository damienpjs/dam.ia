import type { TActivity } from "@/lib/character/face-controller"
import type { TMood } from "@/lib/character/moods"

/**
 * Gestes des bras pendant la conversation, posés par cinématique inverse
 * au-dessus de l'animation IDLE : on ne donne que la position voulue de la
 * main (et la direction du coude), le rig calcule épaule et coude.
 *
 * Repère du personnage : x vers sa gauche, y vers le haut, z devant lui ;
 * en mètres, pour un personnage de 1,70 m.
 */
export const GESTURES = ["none", "talk", "think", "shrug", "open", "akimbo"] as const

export type TGesture = (typeof GESTURES)[number]

export type TVec3 = [number, number, number]

/** Os depuis lequel la cible de la main est exprimée. */
export type TAnchor = "chest" | "head" | "hips"

/**
 * Formes de main livrées dans le .glb (clips HAND_*, une image chacun) :
 * doigts et pouce posés dans Blender, mélangés pendant le geste.
 */
export const HAND_SHAPES = ["open", "talk", "fist", "chin", "hip"] as const

export type THandShape = (typeof HAND_SHAPES)[number]

export interface IHandTarget {
  /**
   * Ancre de la cible. « head » suit la tête (rotation comprise) : une main
   * posée au menton reste au menton quand la tête tourne. Les autres suivent
   * l'orientation du personnage.
   */
  anchor: TAnchor
  /** Position voulue du poignet, relative à l'ancre. */
  offset: TVec3
  /** Direction vers laquelle plier le coude, relative à l'épaule. */
  pole: TVec3
  /** Rotation de l'avant-bras sur son axe (rad) : oriente la paume. */
  twist?: number
  /** Forme de la main pendant le geste ; sans elle, celle du clip. */
  hand?: THandShape
  /** La main vient toucher le corps : approche sans dépassement. */
  contact?: boolean
}

export interface IGesturePose {
  right?: IHandTarget
  left?: IHandTarget
  /** Amplitude du battement de parole appliqué à la main (m). */
  beat?: TVec3
}

/** Symétrique d'une cible de main droite pour la main gauche. */
export function mirror(target: IHandTarget): IHandTarget {
  return {
    ...target,
    offset: [-target.offset[0], target.offset[1], target.offset[2]],
    pole: [-target.pole[0], target.pole[1], target.pole[2]],
    twist: target.twist === undefined ? undefined : -target.twist,
  }
}

const TALK_RIGHT: IHandTarget = { anchor: "chest", offset: [-0.15, -0.06, 0.3], pole: [-0.5, -0.7, -0.3], twist: 1.5, hand: "talk" }
const OPEN_RIGHT: IHandTarget = { anchor: "chest", offset: [-0.3, -0.07, 0.27], pole: [-0.6, -0.6, -0.3], twist: 1.6, hand: "open" }
const SHRUG_RIGHT: IHandTarget = { anchor: "hips", offset: [-0.3, 0.16, 0.24], pole: [-0.3, -0.8, -0.3], twist: 1.8, hand: "open" }
const AKIMBO_RIGHT: IHandTarget = { anchor: "hips", offset: [-0.2, 0.07, -0.03], pole: [-0.9, 0.1, -0.5], hand: "hip", contact: true }

export const GESTURE_POSES: Record<TGesture, IGesturePose> = {
  none: {},
  talk: { right: TALK_RIGHT, beat: [0, 0.05, 0.03] },
  // main au menton : index le long de la mâchoire, avant-bras presque vertical (cible mesurée sur le maillage)
  think: { right: { anchor: "head", offset: [-0.03, -0.11, 0.16], pole: [-0.25, -0.8, 0.5], twist: 1.2, hand: "chin", contact: true } },
  shrug: { right: SHRUG_RIGHT, left: mirror(SHRUG_RIGHT) },
  open: { right: OPEN_RIGHT, left: mirror(OPEN_RIGHT), beat: [0, 0.03, 0.02] },
  akimbo: { right: AKIMBO_RIGHT, left: mirror(AKIMBO_RIGHT) },
}

/** Le geste qui accompagne une activité et une humeur. */
export function gestureFor(activity: TActivity, mood: TMood): TGesture {
  if (activity === "thinking") return "think"
  if (activity !== "talking") return mood === "proud" ? "akimbo" : "none"
  if (mood === "joy" || mood === "surprised") return "open"
  if (mood === "sorry") return "shrug"
  if (mood === "proud") return "akimbo"
  return "talk"
}
