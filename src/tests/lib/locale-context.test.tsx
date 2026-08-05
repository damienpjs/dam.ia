import { describe, it, expect, afterEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LocaleProvider, useLocale } from "@/lib/locale-context"
import { LOCALE_STORAGE_KEY } from "@/constants/i18n"
import { DICTIONARIES } from "@/constants/dictionary"

/** Sonde exposant l'état du contexte et permettant d'en changer. */
function Probe() {
  const { locale, setLocale, t } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="welcome">{t.chat.welcome}</span>
      <button type="button" onClick={() => setLocale("en")}>
        to-en
      </button>
      <button type="button" onClick={() => setLocale("fr")}>
        to-fr
      </button>
    </div>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.lang = "fr"
})

describe("LocaleProvider / useLocale", () => {
  it("démarre en français quand rien n'est mémorisé", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
    expect(screen.getByTestId("welcome")).toHaveTextContent(DICTIONARIES.fr.chat.welcome)
  })

  it("restaure la langue mémorisée en localStorage", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(screen.getByTestId("welcome")).toHaveTextContent(DICTIONARIES.en.chat.welcome)
  })

  it("ignore une valeur mémorisée qui n'est pas une langue supportée", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "klingon")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
  })

  it("mémorise la langue choisie", async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    await user.click(screen.getByRole("button", { name: "to-en" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en")

    await user.click(screen.getByRole("button", { name: "to-fr" }))

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr")
  })

  it("aligne l'attribut lang du document sur la langue courante", async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )
    expect(document.documentElement.lang).toBe("fr")

    await user.click(screen.getByRole("button", { name: "to-en" }))

    expect(document.documentElement.lang).toBe("en")
  })

  it("retombe en français si la lecture de localStorage échoue", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage inaccessible")
    })

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
  })

  it("garde la langue pour la session même si l'écriture échoue", async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota dépassé")
    })

    await user.click(screen.getByRole("button", { name: "to-en" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("en")
  })

  it("rend en français, sans persistance, hors de tout provider", async () => {
    const user = userEvent.setup()
    render(<Probe />)

    expect(screen.getByTestId("locale")).toHaveTextContent("fr")

    await user.click(screen.getByRole("button", { name: "to-en" }))

    expect(screen.getByTestId("locale")).toHaveTextContent("fr")
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })
})
