import { cn } from "@/lib/utils"

interface IDirLabelProps {
  /** Nom du dossier, barre oblique comprise (« expérience/ »). */
  name: string
  /** Contenu du dossier entre parenthèses (« (3 éléments) »). */
  meta?: string
  className?: string
}

/** Titre de section façon dossier : capitales grasses espacées, contenu en corail. */
export function DirLabel({ name, meta, className }: IDirLabelProps) {
  return (
    <h2 className={cn("text-[12px] font-normal lg:text-[14px]", className)}>
      <span className="font-bold tracking-[0.1em] text-ink uppercase">{name}</span>
      {meta && <> <span className="text-coral-ink">{meta}</span></>}
    </h2>
  )
}
