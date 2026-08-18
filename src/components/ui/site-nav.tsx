"use client"

import Link from "next/link"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

/** Route affichée — sert à ne pas proposer un lien vers la page courante. */
export type TNavRoute = "home" | "about"

interface ISiteNavProps {
  current: TNavRoute
  /** Marque cliquable, à gauche : son action diffère selon le contexte
   *  (fermer le chat sur l'accueil, revenir à l'accueil depuis « à propos »). */
  brand?: React.ReactNode
  /** Encarts propres à un contexte, groupés avec la marque (statut LLM). */
  children?: React.ReactNode
  className?: string
}

/**
 * Barre de navigation partagée par l'accueil (header du chat) et la page
 * « à propos ».
 *
 * Mutualiser ce bloc donne au site une navigation stable d'une route à
 * l'autre : le visiteur garde un accès à « à propos » une fois la conversation
 * ouverte — sans quoi la page n'est plus atteignable qu'en refermant le chat.
 *
 * La barre se lit en deux temps : à gauche l'identité et l'état du système, à
 * droite tout ce qui est cliquable. L'écartement vient du `justify-between`,
 * sans espacement inventé, et les pastilles de statut — les éléments les plus
 * lourds visuellement — ne terminent plus la lecture à la place des liens.
 *
 * Le style reste celui des éléments discrets du site : mono, `text-xs`, gris au
 * repos, corail au survol.
 */
export function SiteNav({ current, brand, children, className }: ISiteNavProps) {
  const { t } = useLocale()

  // Groupe de gauche omis quand il serait vide (coin de la landing) : un
  // conteneur à zéro largeur décalerait quand même le groupe de droite du `gap`.
  const identity =
    brand || children ? (
      <div className="flex items-center gap-3">
        {brand}
        {children}
      </div>
    ) : null

  return (
    <nav aria-label={t.common.navLabel} className={cn("flex items-center gap-4", identity ? "justify-between" : "justify-end", className)}>
      {identity}

      <div className="flex items-center gap-3">
        {current !== "about" && (
          <>
            <Link href="/about" className="pointer-events-auto font-mono text-xs text-zinc-500 transition-colors duration-300 hover:text-coral">
              {t.common.navAbout}
            </Link>
            {/* Point médian : sépare la navigation du choix de langue. Il
                reprend le gris du « / » interne au sélecteur — la barre oblique
                départage deux langues, le point départage deux groupes.
                Purement décoratif, donc hors du DOM accessible. */}
            <span aria-hidden="true" className="text-zinc-700">
              ·
            </span>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
