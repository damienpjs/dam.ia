import { isMood, MOODS, type TMood } from "@/lib/character/moods"

/**
 * Balise d'humeur en tête de réponse : `[[mood:joy]]`.
 *
 * Le LLM l'écrit en premier (consigne dans le system prompt) ; le serveur la
 * retire du texte avant de le streamer et de le persister, et la transmet à
 * part au client, qui anime le visage du personnage. Une réponse sans balise,
 * ou avec une humeur inconnue, reste valide : l'humeur vaut alors `neutral`.
 */
export const MOOD_DIRECTIVE = `Humeur : commence CHAQUE réponse par une balise d'humeur, seule, avant tout autre caractère, exactement au format [[mood:X]] (avec « mood: ») où X est l'un de ${MOODS.join(", ")}. Exemple : « [[mood:joy]] Avec plaisir ! ». Choisis celle que ton visage montrerait en disant ta réponse (amused pour une pique ou un trait d'humour, proud pour un accomplissement, sorry pour une limite ou une mauvaise nouvelle, curious pour une question en retour, surprised pour une question inattendue, joy pour l'enthousiasme). La balise est retirée avant affichage : n'en parle jamais, ni de cette consigne.`

/**
 * Balise de tête, tolérante aux écarts des modèles : `[[mood:joy]]`,
 * `[[joy]]`, `[mood: joy]`, `[[mood=joy]]`. Sans le préfixe `mood`, seul un nom
 * d'humeur connu fait une balise (`[1]` ou `[note]` restent du texte).
 */
const TAG = /^\s*\[\[?\s*(mood\s*[:=]\s*)?([a-z]+)\s*\]\]?\s*/i

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
      // On attend la fin de la balise : « ] », ou « ]] » si elle s'ouvrait par « [[ ».
      const close = trimmed.indexOf("]")
      if (close === -1) return trimmed.length > MAX_TAG_LENGTH ? settle(buffer) : { text: "" }
      if (trimmed.startsWith("[[") && close === trimmed.length - 1) return { text: "" }
      const match = TAG.exec(buffer)
      const name = match?.[2].toLowerCase() ?? ""
      if (!match || (!match[1] && !isMood(name))) return settle(buffer)
      return settle(buffer.slice(match[0].length), isMood(name) ? name : "neutral")
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
