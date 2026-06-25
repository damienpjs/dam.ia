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
export const SCENE_BG = "#141d1c" // teal-charbon, raccord avec --background
export const FOG_NEAR = 9
export const FOG_FAR = 24
export const GRID_CELL_COLOR = "#2f5a55" // teal sombre
export const GRID_SECTION_COLOR = "#5f9d92" // teal plus clair, lignes principales
export const KEY_LIGHT = "#ffd6ab" // lumière chaude, nostalgique
export const RIM_LIGHT = "#79c2bc" // teal (chemise)
export const FILL_LIGHT = "#b9a6ef" // lavande douce (fleurs)
