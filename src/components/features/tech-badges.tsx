"use client"

import Image from "next/image"
import { useState } from "react"
import { TECHS, TECHS_VISIBLE_COUNT, type ITech } from "@/constants/landing"
import { cn } from "@/lib/utils"

/**
 * Étiquette d'une techno : un (ou plusieurs) petit logo suivi du nom.
 * Quand il y a plusieurs logos (« Suite Adobe »), ils se chevauchent
 * légèrement à la manière d'une pile d'avatars.
 */
function TechBadge({ tech }: { tech: ITech }) {
  const isStacked = tech.logos.length > 1

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
      <span className="flex items-center">
        {tech.logos.map((logo, index) => (
          <Image key={logo} src={logo} alt="" width={16} height={16} className={cn("h-4 w-4 shrink-0 object-contain", isStacked && "rounded-[3px] ring-1 ring-background/70", isStacked && index > 0 && "-ml-1.5")} />
        ))}
      </span>
      {tech.name}
    </span>
  )
}

/**
 * Liste des technos maîtrisées. Affiche les {@link TECHS_VISIBLE_COUNT}
 * premières puis un bouton « voir X plus » qui révèle le reste.
 */
export function TechBadges() {
  const [expanded, setExpanded] = useState(false)

  const visibleTechs = expanded ? TECHS : TECHS.slice(0, TECHS_VISIBLE_COUNT)
  const hiddenCount = TECHS.length - TECHS_VISIBLE_COUNT

  return (
    <div className="flex max-w-sm flex-wrap justify-center gap-2 text-xs text-zinc-400">
      {visibleTechs.map((tech) => (
        <TechBadge key={tech.name} tech={tech} />
      ))}

      {hiddenCount > 0 && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="pointer-events-auto cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm transition-colors hover:border-coral/40 hover:text-coral">
          voir {hiddenCount} +
        </button>
      )}
    </div>
  )
}
