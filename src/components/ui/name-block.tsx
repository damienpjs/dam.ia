import { cn } from "@/lib/utils"

interface INameBlockProps {
  /** Tailles de police (Tailwind) : le bloc s'adapte à l'accueil comme à « à propos ».
   *  L'interlignage est posé après : tailwind-merge l'effacerait derrière une taille. */
  className?: string
}

/**
 * Le nom en bloc du CV : « damien / pasulj » en minuscules sur deux lignes,
 * serré, suivi d'un carré corail dessiné (et non tapé) pour que le titre reste
 * « damien pasulj » pour les lecteurs d'écran et les moteurs.
 */
export function NameBlock({ className }: INameBlockProps) {
  return (
    <h1 className={cn("-ml-[0.05em] font-bold tracking-[-0.06em] text-ink", className, "leading-[0.86]")}>
      {/* Espace avant le saut de ligne : invisible à l'écran, il donne « damien pasulj » au texte du titre. */}
      {"damien "}
      <br />
      pasulj
      <span aria-hidden="true" className="ml-[0.12em] inline-block size-[0.2em] bg-dot" />
    </h1>
  )
}
