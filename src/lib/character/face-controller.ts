import { EYE_OPEN_REST, FACE_MORPHS, MOOD_HOLD_S, MOOD_POSES, NEUTRAL_HEAD, THINKING_POSE, type IFacePose, type IHeadOffset, type TFaceMorph, type TMood, type TMorphWeights } from "@/lib/character/moods"

/**
 * Ce que fait le personnage pendant la conversation.
 * - `idle` : conversation fermée, il se promène ;
 * - `listening` : conversation ouverte, il attend ou lit la question ;
 * - `thinking` : question envoyée, aucune lettre de réponse encore ;
 * - `talking` : la réponse arrive.
 */
export type TActivity = "idle" | "listening" | "thinking" | "talking"

/** État du visage et de la tête à appliquer à l'image courante. */
export interface IFaceFrame {
  morphs: TMorphWeights
  /** Ouverture des paupières supérieures, par œil (gauche, droit du personnage). */
  eyeOpen: [number, number]
  squint: number
  /** Regard, en unités de l'œil : x vers la gauche du personnage, y vers le haut. */
  gaze: [number, number]
  /** Ouverture de la bouche dessinée par le shader, 0 à 1. */
  mouthOpen: number
  head: IHeadOffset
  /** Battement des gestes de parole, 0 à 1 (bras, hochements). */
  beat: number
}

/** Générateur aléatoire injectable : déterministe dans les tests. */
export type TRandom = () => number

// Rythme des clignements : 15 par minute en moyenne (2,5 à 6 s), 160 ms.
export const BLINK_MIN_S = 2.5
export const BLINK_MAX_S = 6
export const BLINK_CLOSE_S = 0.06
export const BLINK_OPEN_S = 0.1
export const DOUBLE_BLINK_CHANCE = 0.15

// Regard (Lee, Badler et Badler, « Eyes Alive », 2002) : en parlant, regard
// mutuel ~3 s et détours ~1 s ; en écoutant, regard mutuel ~8 s et détours brefs.
const GAZE_AT_S: Record<"talking" | "listening", [number, number]> = { talking: [1.5, 4.5], listening: [4, 9] }
const GAZE_AWAY_S: Record<"talking" | "listening", [number, number]> = { talking: [0.5, 1.4], listening: [0.25, 0.6] }
const GAZE_AWAY_AMPLITUDE: [number, number] = [0.25, 0.7]
const THINKING_GAZE: [number, number] = [0.55, 0.6]

/** Débit de syllabes simulé pendant la parole (Hz) et durée de vie d'un morceau de texte reçu (s). */
const SYLLABLE_HZ = 6.5
const SPEECH_DECAY_S = 0.35

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Lissage exponentiel indépendant de la cadence d'affichage. */
const damp = (current: number, target: number, rate: number, dt: number) => lerp(current, target, 1 - Math.exp(-rate * dt))
const range = (random: TRandom, [min, max]: [number, number]) => min + random() * (max - min)

function emptyMorphs(): TMorphWeights {
  return Object.fromEntries(FACE_MORPHS.map((name) => [name, 0])) as TMorphWeights
}

/**
 * Pilote le visage : humeur, clignements, regard, parole et petits mouvements
 * de tête. Sans dépendance à three.js : la scène lit `frame` à chaque image.
 */
export class FaceController {
  private random: TRandom
  private time = 0
  private activity: TActivity = "idle"
  private mood: TMood = "neutral"
  private moodUntil = 0

  // clignements
  private nextBlink: number
  private blinkStart = -1
  private pendingDouble = false

  // regard
  private gazeTarget: [number, number] = [0, 0]
  private gazeAway = false
  private nextGazeChange: number

  // parole
  private speechEnergy = 0
  private syllablePhase = 0
  /** Mâchoire voulue par l'humeur, avant l'ouverture de la parole. */
  private jawBase = 0

  readonly frame: IFaceFrame = {
    morphs: emptyMorphs(),
    eyeOpen: [EYE_OPEN_REST, EYE_OPEN_REST],
    squint: 0,
    gaze: [0, 0],
    mouthOpen: 0,
    head: { ...NEUTRAL_HEAD },
    beat: 0,
  }

  constructor(random: TRandom = Math.random) {
    this.random = random
    this.nextBlink = range(random, [BLINK_MIN_S, BLINK_MAX_S])
    this.nextGazeChange = range(random, GAZE_AT_S.listening)
  }

  getActivity(): TActivity {
    return this.activity
  }

  getMood(): TMood {
    return this.mood
  }

  setActivity(activity: TActivity): void {
    if (activity === this.activity) return
    // Une réponse qui se termine garde son humeur un moment.
    if (this.activity === "talking" && activity !== "talking") this.moodUntil = this.time + MOOD_HOLD_S
    if (activity === "thinking") this.mood = "neutral"
    this.activity = activity
    // Changer d'état appelle un clignement, comme un regard qui se repose.
    this.scheduleBlink(0.05)
  }

  setMood(mood: TMood): void {
    this.mood = mood
    this.moodUntil = Number.POSITIVE_INFINITY
  }

  /** Un morceau de réponse vient d'arriver : la bouche s'anime le temps de le « dire ». */
  speak(characters: number): void {
    this.speechEnergy = Math.min(1, this.speechEnergy + Math.min(characters, 40) / 40 + 0.25)
  }

  /** Avance d'une image. */
  update(dt: number): IFaceFrame {
    this.time += dt
    if (this.activity !== "talking" && this.time > this.moodUntil) this.mood = "neutral"

    const pose = this.currentPose()
    const f = this.frame

    // humeur → morphs (rapide à venir, lent à partir)
    for (const name of FACE_MORPHS) {
      if (name === "jawOpen") continue
      const target = pose.morphs[name as TFaceMorph] ?? 0
      f.morphs[name] = damp(f.morphs[name], target, target > f.morphs[name] ? 9 : 4, dt)
    }
    const jawTarget = pose.morphs.jawOpen ?? 0
    this.jawBase = damp(this.jawBase, jawTarget, jawTarget > this.jawBase ? 9 : 4, dt)

    // parole : syllabes tant que du texte arrive, silence ensuite
    this.speechEnergy = Math.max(0, this.speechEnergy - dt / SPEECH_DECAY_S)
    this.syllablePhase += dt * SYLLABLE_HZ * Math.PI * 2 * (0.85 + 0.3 * this.random())
    const talking = this.activity === "talking" ? this.speechEnergy : 0
    const syllable = 0.5 + 0.5 * Math.sin(this.syllablePhase)
    f.mouthOpen = damp(f.mouthOpen, talking * (0.25 + 0.55 * syllable), 18, dt)
    f.morphs.jawOpen = Math.min(1, this.jawBase + f.mouthOpen * 0.6)
    f.beat = damp(f.beat, talking * syllable, 6, dt)

    // paupières : pose, puis clignement par-dessus
    const blink = this.blinkAmount()
    const open = pose.eyeOpen * (1 - blink)
    f.eyeOpen[0] = damp(f.eyeOpen[0], open, blink > 0 ? 60 : 12, dt)
    f.eyeOpen[1] = damp(f.eyeOpen[1], open, blink > 0 ? 60 : 12, dt)
    f.squint = damp(f.squint, pose.squint, 8, dt)

    // regard
    this.updateGaze()
    f.gaze[0] = damp(f.gaze[0], this.gazeTarget[0], 25, dt)
    f.gaze[1] = damp(f.gaze[1], this.gazeTarget[1], 25, dt)

    // tête : pose de l'humeur, hochements en parlant, respiration lente
    const nod = f.beat * 0.05
    const sway = Math.sin(this.time * 0.7) * 0.015
    f.head.pitch = damp(f.head.pitch, pose.head.pitch + nod, 5, dt)
    f.head.yaw = damp(f.head.yaw, pose.head.yaw + sway, 3, dt)
    f.head.roll = damp(f.head.roll, pose.head.roll, 3, dt)
    return f
  }

  private currentPose(): IFacePose {
    if (this.activity === "thinking") return THINKING_POSE
    return MOOD_POSES[this.mood]
  }

  private scheduleBlink(delay: number): void {
    if (this.blinkStart >= 0 && this.time - this.blinkStart < BLINK_CLOSE_S + BLINK_OPEN_S) return
    this.nextBlink = Math.min(this.nextBlink, this.time + delay)
  }

  /** 0 → 1 → 0 sur la durée d'un clignement. */
  private blinkAmount(): number {
    if (this.blinkStart < 0 && this.time >= this.nextBlink) {
      this.blinkStart = this.time
    }
    if (this.blinkStart < 0) return 0
    const t = this.time - this.blinkStart
    if (t < BLINK_CLOSE_S) return t / BLINK_CLOSE_S
    if (t < BLINK_CLOSE_S + BLINK_OPEN_S) return 1 - (t - BLINK_CLOSE_S) / BLINK_OPEN_S
    // fin du clignement : le suivant, parfois tout de suite (double clignement)
    this.blinkStart = -1
    if (!this.pendingDouble && this.random() < DOUBLE_BLINK_CHANCE) {
      this.pendingDouble = true
      this.nextBlink = this.time + 0.12
    } else {
      this.pendingDouble = false
      this.nextBlink = this.time + range(this.random, [BLINK_MIN_S, BLINK_MAX_S])
    }
    return 0
  }

  private updateGaze(): void {
    if (this.activity === "thinking") {
      this.gazeTarget = [THINKING_GAZE[0], THINKING_GAZE[1]]
      return
    }
    if (this.time < this.nextGazeChange) return
    const mode = this.activity === "talking" ? "talking" : "listening"
    if (this.gazeAway) {
      this.gazeAway = false
      this.gazeTarget = [(this.random() - 0.5) * 0.08, (this.random() - 0.5) * 0.06]
      this.nextGazeChange = this.time + range(this.random, GAZE_AT_S[mode])
    } else {
      this.gazeAway = true
      // les détours suivent surtout l'horizontale et la verticale
      const axis = Math.floor(this.random() * 4)
      const amplitude = range(this.random, GAZE_AWAY_AMPLITUDE)
      const angle = (axis * Math.PI) / 2 + (this.random() - 0.5) * 0.6
      this.gazeTarget = [Math.cos(angle) * amplitude, Math.sin(angle) * amplitude * 0.6]
      this.nextGazeChange = this.time + range(this.random, GAZE_AWAY_S[mode])
      if (this.random() < 0.3) this.scheduleBlink(0)
    }
  }
}
