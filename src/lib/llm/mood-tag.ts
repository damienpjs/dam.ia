import { isMood, MOODS, type TMood } from "@/lib/character/moods"

/**
 * Balise d'humeur en tête de réponse : `[[mood:joy]]`.
 *
 * Le LLM l'écrit en premier (consigne dans le system prompt) ; le serveur la
 * retire du texte avant de le streamer et de le persister, et la transmet à
 * part au client, qui anime le visage du personnage. Une réponse sans balise,
 * ou avec une humeur inconnue, reste valide : l'humeur vaut alors `neutral`.
 */
export const MOOD_DIRECTIVE = `Humeur : commence CHAQUE réponse par une balise d'humeur, seule, avant tout autre caractère, au format [[mood:X]] où X est l'un de ${MOODS.join(", ")}. Choisis celle que ton visage montrerait en disant ta réponse (amused pour une pique ou un trait d'humour, proud pour un accomplissement, sorry pour une limite ou une mauvaise nouvelle, curious pour une question en retour, surprised pour une question inattendue, joy pour l'enthousiasme). La balise est invisible pour le visiteur : n'y fais jamais référence.`

const TAG = /^\s*\[\[\s*mood\s*:\s*([a-z]+)\s*\]\]\s*/i

/** Au-delà de cette longueur, un début de réponse qui ressemble à une balise n'en est pas une. */
const MAX_TAG_LENGTH = 32

export interface IMoodFilterResult {
  /** Texte à transmettre au visiteur (balise retirée). */
  text: string
  /** Humeur trouvée dans ce morceau, s'il a terminé la balise. */
  mood?: TMood
}

/**
 * Filtre de flux : retient le début de la réponse le temps de savoir s'il
 * s'agit d'une balise, puis laisse tout passer.
 */
export function createMoodFilter() {
  let buffer = ""
  let settled = false
  /** Après une balise, les blancs qui la suivent tombent, même dans le morceau suivant. */
  let trimLead = false

  function settle(text: string, mood?: TMood): IMoodFilterResult {
    settled = true
    buffer = ""
    if (mood) {
      trimLead = !text.trim()
      return { text: text.trimStart(), mood }
    }
    return { text }
  }

  return {
    push(chunk: string): IMoodFilterResult {
      if (settled && trimLead) {
        const text = chunk.trimStart()
        if (text) trimLead = false
        return { text }
      }
      if (settled) return { text: chunk }
      buffer += chunk
      const trimmed = buffer.trimStart()
      if (!trimmed) return { text: "" }
      if (!trimmed.startsWith("[")) return settle(buffer)
      const match = TAG.exec(buffer)
      if (match) {
        const name = match[1].toLowerCase()
        return settle(buffer.slice(match[0].length), isMood(name) ? name : "neutral")
      }
      // Encore incomplet : on attend, sauf si ça ne peut plus être une balise.
      if (trimmed.length > MAX_TAG_LENGTH || (trimmed.length >= 2 && !trimmed.startsWith("[["))) return settle(buffer)
      return { text: "" }
    },
    /** Fin du flux : rend ce qui était retenu (une réponse réduite à « [[ »). */
    flush(): string {
      const rest = settled ? "" : buffer
      settled = true
      buffer = ""
      return rest
    },
  }
}
