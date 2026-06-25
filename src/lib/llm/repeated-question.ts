import { REPEATED_QUESTION_MAX_DISTANCE_RATIO, REPEATED_QUESTION_MIN_LENGTH } from "@/constants/llm"

/**
 * Une question déjà posée plus tôt dans la conversation, détectée de façon
 * déterministe (pas « au feeling » du LLM).
 */
export interface IRepeatedQuestion {
  /** Le texte original (non normalisé) de la question déjà posée. */
  original: string
  /** Nombre de questions utilisateur écoulées depuis (1 = la précédente). */
  turnsAgo: number
}

/**
 * Options de détection (surchargeables pour les tests).
 */
export interface IFindRepeatedQuestionOptions {
  /** Ratio de distance d'édition max sous lequel deux questions sont « identiques ». */
  maxDistanceRatio?: number
  /** Longueur minimale (normalisée) d'une question pour être éligible. */
  minLength?: number
}

/**
 * Normalise une question pour la comparaison : minuscules, sans accents, sans
 * ponctuation, espaces compactés. Deux formulations qui ne diffèrent que par la
 * casse, les accents ou la ponctuation deviennent ainsi strictement égales.
 */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Distance de Levenshtein entre deux chaînes (nombre minimal d'insertions,
 * suppressions ou substitutions de caractères pour passer de l'une à l'autre).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[b.length]
}

/**
 * Cherche, parmi les questions utilisateur précédentes, une question identique ou
 * quasi-identique à la question courante.
 *
 * Détection volontairement conservatrice (exacte / quasi-exacte) : on ne repère
 * qu'une reformulation triviale (casse, accents, ponctuation, faute de frappe),
 * jamais deux sujets simplement proches — pour garantir zéro faux positif.
 *
 * @param current - Question courante (avant normalisation).
 * @param previousUserMessages - Questions utilisateur précédentes, de la plus
 *   ancienne à la plus récente, hors message courant.
 * @returns La première occurrence détectée (la plus ancienne), ou `null`.
 */
export function findRepeatedQuestion(current: string, previousUserMessages: string[], options: IFindRepeatedQuestionOptions = {}): IRepeatedQuestion | null {
  const maxDistanceRatio = options.maxDistanceRatio ?? REPEATED_QUESTION_MAX_DISTANCE_RATIO
  const minLength = options.minLength ?? REPEATED_QUESTION_MIN_LENGTH

  const normalizedCurrent = normalizeQuestion(current)
  if (normalizedCurrent.length < minLength) return null

  for (let i = 0; i < previousUserMessages.length; i++) {
    const candidate = previousUserMessages[i]
    const normalizedCandidate = normalizeQuestion(candidate)
    if (normalizedCandidate.length < minLength) continue

    const distance = levenshtein(normalizedCurrent, normalizedCandidate)
    const threshold = Math.floor(Math.max(normalizedCurrent.length, normalizedCandidate.length) * maxDistanceRatio)
    if (distance <= threshold) {
      return { original: candidate, turnsAgo: previousUserMessages.length - i }
    }
  }

  return null
}
