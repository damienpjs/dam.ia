"use client"

import Link from "next/link"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useLocale } from "@/lib/locale-context"
import { trackEvent, type TAnalyticsEvent } from "@/lib/analytics"
import type { IDictionary } from "@/constants/dictionary"
import { cn } from "@/lib/utils"

/** Route affichée, sert à ne pas proposer un lien vers la page courante. */
export type TNavRoute = "home" | "about" | "projects"

/** Contexte d'affichage de la barre, pour la mesure d'audience. */
export type TNavOrigin = "landing" | "chat" | "about" | "projects"

interface INavEntry {
  route: TNavRoute
  href: string
  label: (common: IDictionary["common"]) => string
  event: TAnalyticsEvent
}

/** Entrées dans l'ordre d'affichage ; la page courante est retirée. */
const NAV_ENTRIES: INavEntry[] = [
  { route: "home", href: "/", label: (common) => common.navChat, event: "chat_link_clicked" },
  { route: "projects", href: "/projects", label: (common) => common.navProjects, event: "projects_link_clicked" },
  { route: "about", href: "/about", label: (common) => common.navAbout, event: "about_link_clicked" },
]

interface ISiteNavProps {
  current: TNavRoute
  /** Marque cliquable, à gauche (retour à l'accueil depuis les pages secondaires). */
  brand?: React.ReactNode
  /** Contexte d'où part le clic, remonté à GA4 sous le paramètre `from`.
   *  L'accueil n'a qu'une barre pour la landing et le chat : sans cette prop,
   *  les deux contextes seraient indiscernables. */
  analyticsFrom?: TNavOrigin
  className?: string
}

const LINK_CLASS = "pointer-events-auto py-3 font-medium text-ink no-underline transition-colors hover:text-teal-ink"

/**
 * Barre de navigation partagée par l'accueil, « à propos » et « projets ».
 *
 * Les entrées sont des noms de dossiers (« projets/ », « à-propos/ »,
 * « conversation/ »), comme les sections du CV. Une seule instance sur
 * l'accueil, fixée en haut à droite : elle reste au-dessus de la scène quand
 * le panneau de conversation s'ouvre à gauche.
 */
export function SiteNav({ current, brand, className, analyticsFrom = "landing" }: ISiteNavProps) {
  const { t } = useLocale()

  return (
    <nav aria-label={t.common.navLabel} className={cn("flex items-center gap-5 text-[13px] lg:gap-8 lg:text-[14px]", brand ? "justify-between" : "justify-end", className)}>
      {brand}

      <div className="flex items-center gap-5 lg:gap-8">
        {NAV_ENTRIES.filter((entry) => entry.route !== current).map((entry) => (
          <Link key={entry.route} href={entry.href} onClick={() => trackEvent(entry.event, { from: analyticsFrom })} className={LINK_CLASS}>
            {entry.label(t.common)}
          </Link>
        ))}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
