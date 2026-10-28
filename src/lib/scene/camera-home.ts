import { CAMERA_START, CONTROLS_TARGET } from "@/constants/scene"

export type TVec3 = readonly [number, number, number]

/**
 * Écart (en unités de scène) au-delà duquel la caméra est considérée comme
 * déplacée par le visiteur : assez large pour ignorer la fin d'un amorti,
 * assez fin pour qu'un petit coup de molette compte.
 */
export const HOME_EPSILON = 0.05

/** Vitesse du retour à la vue de départ (facteur exponentiel par seconde). */
export const HOME_RETURN_RATE = 6

/** En dessous de cet écart, le retour s'arrête et se cale exactement. */
export const HOME_SNAP = 0.002

const distance = (a: TVec3, b: TVec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** La caméra a-t-elle quitté sa vue de départ (rotation ou zoom) ? */
export function isAwayFromHome(position: TVec3, target: TVec3, epsilon = HOME_EPSILON): boolean {
  return distance(position, CAMERA_START) > epsilon || distance(target, CONTROLS_TARGET) > epsilon
}

/** Le retour est-il assez proche du but pour se caler dessus ? */
export function isHomeReached(position: TVec3, target: TVec3): boolean {
  return !isAwayFromHome(position, target, HOME_SNAP)
}

/** Part du chemin restant à parcourir pendant `dt`, indépendante de la cadence. */
export function homeEase(dt: number, rate = HOME_RETURN_RATE): number {
  return 1 - Math.exp(-rate * dt)
}
