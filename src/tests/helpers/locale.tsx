import type { ReactElement } from "react"
import { render, type RenderOptions, type RenderResult } from "@testing-library/react"
import { LOCALE_STORAGE_KEY, type TLocale } from "@/constants/i18n"
import { LocaleProvider } from "@/lib/locale-context"

/**
 * Rend un composant dans une langue donnée, en passant par le vrai chemin de
 * persistance (localStorage → LocaleProvider) plutôt que par un provider truqué.
 */
export function renderWithLocale(ui: ReactElement, locale: TLocale, options?: RenderOptions): RenderResult {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  return render(<LocaleProvider>{ui}</LocaleProvider>, options)
}
