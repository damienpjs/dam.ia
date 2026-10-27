import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** `plain` : filet seul. `accent` : l'aplat teal du todo.md du CV, texte à l'encre. */
export type TFileBoxTone = "plain" | "accent"

interface IFileBoxProps {
  /** Nom du fichier, en tête de la boîte. */
  name: string
  /** Lien porté par le nom de fichier, s'il pointe quelque part. */
  href?: string
  /** Métadonnée entre parenthèses (taille, nombre d'éléments), en corail. */
  meta?: string
  tone?: TFileBoxTone
  className?: string
  children: ReactNode
}

/**
 * Boîte « fichier » du CV : un filet, un en-tête « nom (taille) », un contenu.
 * Brique de base de la page « à propos » et du message d'accueil.
 */
export function FileBox({ name, href, meta, tone = "plain", className, children }: IFileBoxProps) {
  const accent = tone === "accent"
  const nameClass = accent ? "text-ink underline decoration-1 underline-offset-[3px]" : "file-name"

  return (
    <div data-testid="file-box" data-tone={tone} className={cn("self-start border px-4 pt-3 pb-3.5 lg:px-5 lg:pt-4 lg:pb-[18px]", accent ? "border-teal bg-teal text-ink" : "border-rule", className)}>
      <p className="mb-2 text-[12px] lg:mb-2.5 lg:text-[13px]">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={cn(nameClass, "hover:text-ink")}>
            {name}
          </a>
        ) : (
          <span className={nameClass}>{name}</span>
        )}
        {meta && <> <span className={accent ? "text-ink" : "text-coral-ink"}>{meta}</span></>}
      </p>
      {children}
    </div>
  )
}
