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
  /** Encarts propres à un contexte, insérés avant les liens (statut LLM). */
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
 * Le style reste celui des éléments discrets du site : mono, `text-xs`, gris au
 * repos, corail au survol.
 */
export function SiteNav({ current, brand, children, className }: ISiteNavProps) {
  const { t } = useLocale()

  return (
    <nav aria-label={t.common.navLabel} className={cn("flex items-center justify-between gap-4", className)}>
      {/* Emplacement conservé même sans marque : le groupe de droite reste aligné à droite. */}
      {brand ?? <span />}

      <div className="flex items-center gap-3">
        {children}
        {current !== "about" && (
          <Link href="/about" className="pointer-events-auto font-mono text-xs text-zinc-500 transition-colors duration-300 hover:text-coral">
            {t.common.navAbout}
          </Link>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
