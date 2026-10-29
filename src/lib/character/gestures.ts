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

/** Phalange du .glb, sans le côté : « Index2 » est la phalange du milieu de l'index. */
export type TFingerBone = `${"Thumb" | "Index" | "Middle" | "Ring" | "Pinky"}${1 | 2 | 3}`

/** Point de contact : la phalange `finger` vient se poser sur `offset`, dans le repère de l'ancre. */
export interface ITouch {
  finger: TFingerBone
  offset: TVec3
}

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
  /** Pli du poignet (rad) : flexion vers la paume, déviation vers le pouce. */
  wrist?: [number, number]
  /** Forme de la main pendant le geste ; sans elle, celle du clip. */
  hand?: THandShape
  /** La main vient toucher le corps : approche sans dépassement. */
  contact?: boolean
  /**
   * Oriente la main pour poser une phalange sur un point de l'ancre. Sans lui,
   * l'orientation suit l'avant-bras, qui bouge avec l'idle : le contact varierait.
   */
  touch?: ITouch
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
const AKIMBO_RIGHT: IHandTarget = { anchor: "hips", offset: [-0.225, 0.1, -0.02], pole: [-0.9, 0.1, -0.5], hand: "hip", contact: true }

export const GESTURE_POSES: Record<TGesture, IGesturePose> = {
  none: {},
  talk: { right: TALK_RIGHT, beat: [0, 0.05, 0.03] },
  // main au menton : le coude s'écarte devant l'épaule pour que l'avant-bras passe
  // devant la poitrine, la paume tournée vers le cou, le menton posé sur l'index replié
  // (cible mesurée sur le maillage v4 : l'index à 1,3 mm sous le menton, sans le traverser)
  think: { right: { anchor: "head", offset: [-0.039, -0.151, 0.162], pole: [-0.6, -0.6, 0.5], twist: 0.5, wrist: [0.1, 0.35], hand: "chin", contact: true, touch: { finger: "Index2", offset: [0.024, -0.056, 0.098] } } },
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

/**
 * Part du regard vers la caméra selon l'activité. En réfléchissant, la tête
 * garde sa propre pose (regard en l'air, de côté) : la main posée au menton la
 * suit, et une tête qui tournerait vers la caméra entraînerait le bras à travers
 * la poitrine.
 */
export function cameraLookFor(activity: TActivity): number {
  return activity === "thinking" ? 0 : 1
}
