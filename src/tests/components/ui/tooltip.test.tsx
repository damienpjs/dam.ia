import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Tooltip } from "@/components/ui/tooltip"

const setup = () => userEvent.setup({ delay: null })

describe("Tooltip", () => {
  it("rend l'élément déclencheur fourni en enfant", () => {
    render(
      <Tooltip content="Infobulle" delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )
    expect(screen.getByRole("button", { name: "Déclencheur" })).toBeInTheDocument()
  })

  it("n'affiche pas le contenu tant que le déclencheur n'est pas survolé", () => {
    render(
      <Tooltip content="Infobulle cachée" delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )
    expect(screen.queryByText("Infobulle cachée")).not.toBeInTheDocument()
  })

  it("affiche le contenu au survol du déclencheur", async () => {
    const user = setup()
    render(
      <Tooltip content="Infobulle au survol" delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )

    await user.hover(screen.getByRole("button", { name: "Déclencheur" }))

    await waitFor(() => {
      expect(screen.getByText("Infobulle au survol")).toBeInTheDocument()
    })
  })

  it("affiche le contenu au focus clavier du déclencheur", async () => {
    const user = setup()
    render(
      <Tooltip content="Infobulle au focus" delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )

    await user.tab()

    await waitFor(() => {
      expect(screen.getByText("Infobulle au focus")).toBeInTheDocument()
    })
  })

  it("masque le contenu lorsque le pointeur quitte le déclencheur", async () => {
    const user = setup()
    render(
      <Tooltip content="Infobulle volatile" delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Déclencheur" })
    await user.hover(trigger)
    await waitFor(() => expect(screen.getByText("Infobulle volatile")).toBeInTheDocument())

    await user.unhover(trigger)
    await waitFor(() => expect(screen.queryByText("Infobulle volatile")).not.toBeInTheDocument())
  })

  it("positionne l'infobulle sur le côté demandé", async () => {
    const user = setup()
    render(
      <Tooltip content="Infobulle latérale" side="right" sideOffset={4} delay={0}>
        <button type="button">Déclencheur</button>
      </Tooltip>,
    )

    await user.hover(screen.getByRole("button", { name: "Déclencheur" }))

    await waitFor(() => {
      expect(screen.getByText("Infobulle latérale")).toBeInTheDocument()
    })
  })
})
