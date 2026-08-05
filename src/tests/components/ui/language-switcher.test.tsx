import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { LocaleProvider } from "@/lib/locale-context"
import { LOCALE_STORAGE_KEY } from "@/constants/i18n"
import { DICTIONARIES } from "@/constants/dictionary"

function renderSwitcher() {
  return render(
    <LocaleProvider>
      <LanguageSwitcher />
    </LocaleProvider>,
  )
}

afterEach(() => {
  localStorage.clear()
})

describe("LanguageSwitcher", () => {
  it("affiche le wording « FR / EN »", () => {
    const switcher = renderSwitcher().getByTestId("language-switcher")
    // Les espaces autour de la barre oblique viennent du `gap` flex, pas du DOM.
    expect([...switcher.children].map((child) => child.textContent)).toEqual(["FR", "/", "EN"])
  })

  it("regroupe les deux boutons sous un libellé accessible", () => {
    renderSwitcher()
    expect(screen.getByRole("group", { name: DICTIONARIES.fr.common.languageLabel })).toBeInTheDocument()
  })

  it("marque la langue courante comme sélectionnée", () => {
    renderSwitcher()
    expect(screen.getByRole("button", { name: DICTIONARIES.fr.common.localeNames.fr })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: DICTIONARIES.fr.common.localeNames.en })).toHaveAttribute("aria-pressed", "false")
  })

  it("bascule en anglais au clic sur EN et mémorise le choix", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByText("EN"))

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en")
    // Le libellé accessible suit la langue courante
    expect(screen.getByRole("group", { name: DICTIONARIES.en.common.languageLabel })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: DICTIONARIES.en.common.localeNames.en })).toHaveAttribute("aria-pressed", "true")
  })

  it("revient au français au clic sur FR", async () => {
    const user = userEvent.setup()
    localStorage.setItem(LOCALE_STORAGE_KEY, "en")
    renderSwitcher()

    await user.click(screen.getByText("FR"))

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr")
    expect(screen.getByRole("button", { name: DICTIONARIES.fr.common.localeNames.fr })).toHaveAttribute("aria-pressed", "true")
  })

  it("met la langue active en avant et l'autre en retrait", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    expect(screen.getByText("FR").className).toContain("text-coral")
    expect(screen.getByText("EN").className).not.toContain("text-coral")

    await user.click(screen.getByText("EN"))

    expect(screen.getByText("EN").className).toContain("text-coral")
    expect(screen.getByText("FR").className).not.toContain("text-coral")
  })

  it("accepte des classes supplémentaires (positionnement par le parent)", () => {
    render(
      <LocaleProvider>
        <LanguageSwitcher className="fixed right-4 top-4" />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("language-switcher").className).toContain("fixed")
  })
})
