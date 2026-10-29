import type { TActivity } from "@/lib/character/face-controller"
import type { TMood } from "@/lib/character/moods"

/**
 * Signaux de la conversation vers le personnage 3D.
 *
 * La conversation (React) et la scène (boucle three.js) ne partagent pas de
 * rendu : la scène lit ces signaux à chaque image, sans re-render. Le chat
 * écrit, la scène consomme les morceaux de texte reçus depuis sa dernière
 * lecture.
 */
interface ICues {
  activity: TActivity
  mood: TMood
  /** Caractères reçus depuis la dernière lecture par la scène. */
  pendingSpeech: number
  /** Incrémenté à chaque nouvelle humeur, pour la réappliquer même identique. */
  moodVersion: number
}

const cues: ICues = { activity: "idle", mood: "neutral", pendingSpeech: 0, moodVersion: 0 }

export function setCharacterActivity(activity: TActivity): void {
  cues.activity = activity
}

export function setCharacterMood(mood: TMood): void {
  cues.mood = mood
  cues.moodVersion += 1
}

/** Un morceau de réponse est arrivé : le personnage le « dit ». */
export function characterSpeaks(text: string): void {
  cues.pendingSpeech += text.length
}

/** Lecture par la scène : rend l'état et vide les caractères en attente. */
export function readCharacterCues(): Readonly<ICues> & { speech: number } {
  const speech = cues.pendingSpeech
  cues.pendingSpeech = 0
  return { ...cues, speech }
}

/** Remise à zéro (fermeture du chat, tests). */
export function resetCharacterCues(): void {
  cues.activity = "idle"
  cues.mood = "neutral"
  cues.pendingSpeech = 0
  cues.moodVersion = 0
}
