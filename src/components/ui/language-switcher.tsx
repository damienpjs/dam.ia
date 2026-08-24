"use client"

import { Fragment } from "react"
import { LOCALES, LOCALE_LABELS, type TLocale } from "@/constants/i18n"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

interface ILanguageSwitcherProps {
  className?: string
}

/**
 * Sélecteur de langue « FR / EN ».
 *
 * Deux boutons séparés d'une barre oblique plutôt qu'un menu déroulant : avec
 * seulement deux langues, tout est visible d'un coup d'œil et le choix se fait
 * en un clic. La langue active est en corail, l'autre en gris discret.
 */
export function LanguageSwitcher({ className }: ILanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale()

  // Cliquer la langue déjà active ne change rien : on ne le compte pas comme
  // une bascule, sinon la mesure gonfle sans qu'aucun choix ait été fait.
  function handleSelect(code: TLocale) {
    if (code !== locale) trackEvent("locale_changed", { from: locale, to: code })
    setLocale(code)
  }

  return (
    <div data-testid="language-switcher" role="group" aria-label={t.common.languageLabel} className={cn("pointer-events-auto flex items-center gap-1 font-mono text-xs", className)}>
      {LOCALES.map((code, index) => (
        <Fragment key={code}>
          {index > 0 && (
            <span aria-hidden="true" className="text-zinc-700">
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={locale === code}
            aria-label={t.common.localeNames[code]}
            className={cn("cursor-pointer rounded px-1 py-0.5 transition-colors duration-300", locale === code ? "text-coral" : "text-zinc-500 hover:text-zinc-300")}
          >
            {LOCALE_LABELS[code]}
          </button>
        </Fragment>
      ))}
    </div>
  )
}
