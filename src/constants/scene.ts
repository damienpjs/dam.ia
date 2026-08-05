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
export const WANDER_RADIUS = 3
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
export const CAMERA_START: [number, number, number] = [4.2, 2.3, 5.4]
export const CAMERA_FOV = 42
/** Cible de l'orbite : à hauteur de buste du personnage. */
export const CONTROLS_TARGET: [number, number, number] = [0, 0.95, 0]
export const MIN_DISTANCE = 2.6
export const MAX_DISTANCE = 9
/** Angle polaire min (vue de dessus limitée) et max (jamais sous le sol). */
export const MIN_POLAR = 0.2
export const MAX_POLAR = Math.PI / 2 - 0.04

// ── Couleurs de la scène (chemise tropicale + vibe CRT rétro) ────────────
export const SCENE_BG = "#15211c" // teal-charbon légèrement verdi (moniteur cathodique)
export const FOG_NEAR = 11
export const FOG_FAR = 30
export const GRID_CELL_COLOR = "#356b50" // vert sombre (phosphore)
export const GRID_SECTION_COLOR = "#74c08a" // vert CRT plus clair, lignes principales
export const KEY_LIGHT = "#abffe2" // couleur statique de repli (mouvement réduit) : vert phosphore
/**
 * La key light oscille en boucle entre une teinte chaude et une teinte froide,
 * en écho au dégradé animé du prénom « Damien » dans le titre. Fondu sinusoïdal,
 * sans à-coups, calé sur la même cadence (4 s) que l'animation CSS du titre.
 */
export const KEY_LIGHT_WARM = "#ffd6ab" // pêche chaude (nostalgie)
export const KEY_LIGHT_COOL = "#abffe2" // vert phosphore froid (CRT)
/** Durée d'un aller-retour complet chaud → froid → chaud, en secondes. */
export const KEY_LIGHT_OSC_PERIOD_S = 4
export const RIM_LIGHT = "#79c2bc" // teal (chemise)
export const FILL_LIGHT = "#b9a6ef" // lavande douce (fleurs)
/** Vert phosphore d'un vieux moniteur cathodique : ambiance/hémisphère. */
export const CRT_GLOW = "#88e3b4"

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
