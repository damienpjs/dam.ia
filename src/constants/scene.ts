/**
 * Configuration de la hero scene 3D.
 *
 * Le personnage (founder.glb) déambule librement sur le sol : il alterne entre les
 * clips d'animation IDLE et WALKING, en se dirigeant vers des points aléatoires.
 * Cette première étape pose les bases du futur diorama (le bureau de Damien).
 */

/** Chemin du modèle dans /public. */
export const MODEL_PATH = "/models/founder.glb"

/** Noms exacts des clips d'animation embarqués dans le .glb. */
export const ANIM_IDLE = "IDLE"
export const ANIM_WALK = "WALKING"

/**
 * Le .glb peut être modélisé à n'importe quelle échelle / position. On normalise
 * le personnage à cette hauteur (en unités three) avec les pieds posés sur y=0.
 */
export const CHARACTER_HEIGHT = 1.7

/**
 * Orientation « avant » du modèle, en radians, autour de l'axe Y.
 * Si le personnage marche à reculons, passer cette valeur à `Math.PI`.
 */
export const MODEL_FORWARD_OFFSET = 0

// ── Déambulation aléatoire ───────────────────────────────────────────────
/** Rayon de la zone (sur le sol) dans laquelle le personnage se balade. */
export const WANDER_RADIUS = 2.2
/** Vitesse de marche, en unités/seconde. */
export const WALK_SPEED = 0.85
/** Vitesse d'orientation vers la cible (facteur de lerp angulaire/seconde). */
export const TURN_SPEED = 7
/** Distance en deçà de laquelle la cible est considérée atteinte. */
export const ARRIVE_DISTANCE = 0.18
/** Durée minimale/maximale d'une pause (IDLE), en secondes. */
export const IDLE_MIN_S = 2.4
export const IDLE_MAX_S = 5.5
/** Durée du fondu enchaîné entre deux animations, en secondes. */
export const FADE_S = 0.35

// ── Caméra & contrôles (clic-glissé + zoom) ──────────────────────────────
/** Position de départ : même angle qu'avant, rapprochée (×0,82) pour que le
 *  personnage garde de la présence une fois décalé sur le côté. */
export const CAMERA_START: [number, number, number] = [3.44, 2.06, 4.43]
export const CAMERA_FOV = 42
/** Cible de l'orbite : à hauteur de buste du personnage. */
export const CONTROLS_TARGET: [number, number, number] = [0, 0.95, 0]
export const MIN_DISTANCE = 2.6
export const MAX_DISTANCE = 9
/** Angle polaire min (vue de dessus limitée) et max (jamais sous le sol). */
export const MIN_POLAR = 0.2
export const MAX_POLAR = Math.PI / 2 - 0.04

// ── Cadrage selon la mise en page ────────────────────────────────────────
/**
 * Décalage du cadrage (`camera.setViewOffset`) : déplace le personnage dans
 * l'écran sans toucher à l'orbite. `x` et `y` sont des fractions de la largeur
 * et de la hauteur (positif : vers la droite, vers le bas), `zoom` agit sur la
 * focale. Sur desktop, l'interface tient dans la moitié gauche : le personnage
 * vit à droite. Sur mobile, le texte occupe le haut : il descend.
 *
 * En conversation, la caméra se rapproche jusqu'au plan taille, tête au tiers
 * haut du panneau droit : le visage doit se lire (humeurs, regard, bouche).
 */
export interface IViewOffset {
  x: number
  y: number
  zoom: number
}

/** Mise en page de l'accueil qui pilote le cadrage. */
export type TSceneLayout = "landing" | "chat"

export const VIEW_OFFSET_WIDE: Record<TSceneLayout, IViewOffset> = {
  landing: { x: 0.17, y: 0.03, zoom: 1 },
  chat: { x: 0.29, y: 0.2, zoom: 2.4 },
}
export const VIEW_OFFSET_NARROW: IViewOffset = { x: 0.03, y: 0.35, zoom: 0.58 }
/** Largeur (px) à partir de laquelle le cadrage « desktop » s'applique (breakpoint `lg`). */
export const WIDE_LAYOUT_MIN_WIDTH = 1024
/** Vitesse du glissement d'un cadrage à l'autre (facteur de lerp par seconde). */
export const VIEW_OFFSET_EASE = 4

// ── Couleurs de la scène (papier du CV) ──────────────────────────────────
// Le canvas est transparent : le fond est le papier du site lui-même, ce qui
// garantit un raccord exact avec les panneaux et laisse passer le grain.
export const FOG_COLOR = "#eef0ec" // papier
export const FOG_NEAR = 9
export const FOG_FAR = 24
export const GRID_CELL_COLOR = "#cdd4d1" // filets clairs, à peine plus foncés que le papier
export const GRID_SECTION_COLOR = "#98aaa5" // lignes principales, gris-vert du CV
export const HEMI_SKY = "#ffffff"
export const HEMI_GROUND = "#c3ccc8" // filet du CV : rebond doux et froid sous le personnage
export const KEY_LIGHT = "#fff1e0" // blanc légèrement chaud
export const RIM_LIGHT = "#84c7c1" // teal de la charte (et de la chemise)
export const FILL_LIGHT = "#efa07a" // corail de la charte, en contre-jour
export const SHADOW_COLOR = "#0b1110" // encre
export const SHADOW_OPACITY = 0.32

// ── Glitch CRT (post-processing GPU, déclenchement sporadique) ────────────
/**
 * Pause aléatoire (min/max, en secondes) entre deux glitchs : rare, « de temps
 * en temps », pour rester sobre et raccord avec l'ambiance discrète.
 */
export const GLITCH_DELAY_MIN = 5
export const GLITCH_DELAY_MAX = 12
/** Durée (min/max, en secondes) d'un glitch : bref, comme une coupure de signal. */
export const GLITCH_DURATION_MIN = 0.1
export const GLITCH_DURATION_MAX = 0.28
/** Intensité (min/max) du décalage de blocs : franc mais sans saturer. */
export const GLITCH_STRENGTH_MIN = 0.15
export const GLITCH_STRENGTH_MAX = 0.4
/** Décalage d'aberration chromatique (RGB split) pendant le glitch. */
export const GLITCH_CHROMATIC_OFFSET = 0.0015

// ── Bulle de réplique (BD sobre) au-dessus du personnage ──────────────────
// Les répliques elles-mêmes sont traduites : elles vivent dans le dictionnaire
// (`scene.bubbleLines`, cf. `src/constants/dictionary.ts`).
/** Pause aléatoire (min/max, en secondes) entre deux apparitions de la bulle. */
export const BUBBLE_DELAY_MIN = 5
export const BUBBLE_DELAY_MAX = 15
/** Durée d'affichage de la bulle, en secondes. */
export const BUBBLE_DURATION = 4.5
/** Hauteur de la bulle au-dessus des pieds du personnage (unités three). */
export const BUBBLE_HEIGHT = 2.05
