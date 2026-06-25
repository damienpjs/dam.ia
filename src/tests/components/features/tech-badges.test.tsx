import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TechBadges } from "@/components/features/tech-badges"
import { TECHS, TECHS_VISIBLE_COUNT } from "@/constants/landing"

describe("TechBadges", () => {
  it("n'affiche que les premières technos avant interaction", () => {
    render(<TechBadges />)

    for (const tech of TECHS.slice(0, TECHS_VISIBLE_COUNT)) {
      expect(screen.getByText(tech.name)).toBeInTheDocument()
    }
    for (const tech of TECHS.slice(TECHS_VISIBLE_COUNT)) {
      expect(screen.queryByText(tech.name)).not.toBeInTheDocument()
    }
  })

  it("affiche un bouton « voir X + » avec le bon décompte", () => {
    render(<TechBadges />)
    const hidden = TECHS.length - TECHS_VISIBLE_COUNT
    expect(screen.getByRole("button", { name: `voir ${hidden} +` })).toBeInTheDocument()
  })

  it("révèle les technos restantes au clic et masque le bouton", async () => {
    const user = userEvent.setup()
    render(<TechBadges />)

    await user.click(screen.getByRole("button", { name: /voir \d+ \+/i }))

    for (const tech of TECHS) {
      expect(screen.getByText(tech.name)).toBeInTheDocument()
    }
    expect(screen.queryByRole("button", { name: /voir \d+ \+/i })).not.toBeInTheDocument()
  })

  it("affiche un logo avant chaque techno visible", () => {
    const { container } = render(<TechBadges />)
    const expectedLogos = TECHS.slice(0, TECHS_VISIBLE_COUNT).reduce((sum, t) => sum + t.logos.length, 0)
    expect(container.querySelectorAll("img")).toHaveLength(expectedLogos)
  })

  it("empile plusieurs logos pour la Suite Adobe une fois déployée", async () => {
    const user = userEvent.setup()
    const { container } = render(<TechBadges />)

    await user.click(screen.getByRole("button", { name: /voir \d+ \+/i }))

    const adobe = TECHS.find((t) => t.name === "Suite Adobe")
    expect(adobe).toBeDefined()
    expect(adobe!.logos.length).toBeGreaterThan(1)

    const totalLogos = TECHS.reduce((sum, t) => sum + t.logos.length, 0)
    expect(container.querySelectorAll("img")).toHaveLength(totalLogos)
  })
})
