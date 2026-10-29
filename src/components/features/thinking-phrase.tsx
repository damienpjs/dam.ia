"use client"

import { useEffect, useState } from "react"
import { useLocale } from "@/lib/locale-context"

// Vitesse de frappe (ms par caractère). Volontairement irrégulière à l'œil mais simple à tester.
const TYPING_SPEED_MS = 45

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

/**
 * Placeholder de « réflexion » : une phrase aléatoire à la sauce « Damien réfléchit »
 * tapée lettre par lettre, suivie d'un curseur bloc qui clignote, comme un
 * terminal qui attend sa sortie.
 */
export function ThinkingPhrase() {
  const { t } = useLocale()
  const phrases = t.chat.thinkingPhrases

  // Le tirage est figé au montage (la phrase ne doit pas changer à chaque
  // re-render du parent) mais mémorisé sous forme de position, pas de texte :
  // si le visiteur bascule de langue pendant la réflexion, c'est la même phrase
  // qui reste affichée, traduite.
  const [pick] = useState(Math.random)
  const phrase = phrases[Math.floor(pick * phrases.length)]

  const reduced = prefersReducedMotion()
  const [shown, setShown] = useState(() => (reduced ? phrase : ""))

  useEffect(() => {
    if (reduced) return

    let index = 0
    const id = setInterval(() => {
      index += 1
      setShown(phrase.slice(0, index))
      if (index >= phrase.length) clearInterval(id)
    }, TYPING_SPEED_MS)

    return () => clearInterval(id)
  }, [phrase, reduced])

  return (
    <div data-testid="thinking-phrase" role="status" className="text-body" aria-label={t.chat.thinkingAria}>
      <span aria-hidden="true">{shown}</span>
      <span data-testid="thinking-cursor" aria-hidden="true" className="cursor-block" />
    </div>
  )
}
