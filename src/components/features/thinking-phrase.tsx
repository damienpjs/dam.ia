"use client"

import { useEffect, useState } from "react"
import { THINKING_PHRASES } from "@/constants/chat"

// Vitesse de frappe (ms par caractère). Volontairement irrégulière à l'œil mais simple à tester.
const TYPING_SPEED_MS = 45

function pickRandomPhrase(): string {
  return THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

/**
 * Placeholder de « réflexion » : une phrase aléatoire à la sauce « Damien réfléchit… »
 * tapée lettre par lettre, suivie de trois points qui sautillent (animation CSS).
 * Remplace l'ancien skeleton pendant que l'IA prépare sa réponse.
 */
export function ThinkingPhrase() {
  // Phrase figée au montage : ne doit pas changer à chaque re-render du parent.
  const [phrase] = useState(pickRandomPhrase)

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
    <div data-testid="thinking-phrase" className="flex items-baseline text-sm leading-relaxed text-muted-foreground" aria-label="Damien réfléchit">
      <span aria-hidden="true">{shown}</span>
      {/* Délais de cascade gérés en CSS via :nth-child (cf. globals.css) */}
      <span aria-hidden="true" className="ml-0.5 inline-flex">
        <span className="animate-thinking-dot">.</span>
        <span className="animate-thinking-dot">.</span>
        <span className="animate-thinking-dot">.</span>
      </span>
    </div>
  )
}
