"use client"

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type TLocale } from "@/constants/i18n"
import { getDictionary, type IDictionary } from "@/constants/dictionary"

interface ILocaleContext {
  /** Langue courante. */
  locale: TLocale
  /** Change la langue et la mémorise dans localStorage. */
  setLocale: (locale: TLocale) => void
  /** Dictionnaire de la langue courante. */
  t: IDictionary
}

/**
 * Valeur par défaut, hors provider : français, sans persistance. Elle permet de
 * rendre un composant isolé (test unitaire) sans l'envelopper.
 */
const LocaleContext = createContext<ILocaleContext>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: getDictionary(DEFAULT_LOCALE),
})

// Isomorphic : useLayoutEffect côté client, useEffect côté serveur (SSR)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function readStoredLocale(): TLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    // localStorage inaccessible (navigation privée, cookies bloqués)
    return DEFAULT_LOCALE
  }
}

/**
 * Fournit la langue courante à toute l'application.
 *
 * Le premier rendu utilise systématiquement {@link DEFAULT_LOCALE} pour rester
 * identique au HTML produit côté serveur (pas d'erreur d'hydratation) ; la
 * langue mémorisée est relue juste après, avant le premier paint, de sorte que
 * le visiteur ne voit pas passer le français.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<TLocale>(DEFAULT_LOCALE)

  useIsomorphicLayoutEffect(() => {
    setLocaleState(readStoredLocale())
  }, [])

  // Garde l'attribut `lang` du document aligné : lecteurs d'écran, correcteurs
  // orthographiques et traduction automatique s'appuient dessus.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: TLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Écriture impossible : la langue reste valable pour la session en cours.
    }
  }, [])

  const value = useMemo<ILocaleContext>(() => ({ locale, setLocale, t: getDictionary(locale) }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** Accès à la langue courante, à son dictionnaire et au sélecteur. */
export function useLocale(): ILocaleContext {
  return useContext(LocaleContext)
}
