import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SceneResetButton } from "@/components/features/scene-reset-button"
import { DICTIONARIES } from "@/constants/dictionary"

const { scene } = DICTIONARIES.fr

function setup(visible: boolean, layout: "landing" | "chat" = "landing") {
  const onReset = vi.fn()
  render(<SceneResetButton visible={visible} layout={layout} label={scene.resetView} hint={scene.resetViewHint} onReset={onReset} />)
  return { onReset, wrapper: screen.getByTestId("scene-reset") }
}

describe("SceneResetButton", () => {
  it("reste caché et inerte tant que la caméra n'a pas bougé", () => {
    const { wrapper } = setup(false)
    expect(wrapper).toHaveClass("opacity-0", "pointer-events-none")
    expect(wrapper).toHaveAttribute("inert")
  })

  it("apparaît une fois la caméra déplacée et demande le recadrage au clic", async () => {
    const { wrapper, onReset } = setup(true)
    expect(wrapper).toHaveClass("opacity-100")
    expect(wrapper).not.toHaveAttribute("inert")
    const button = screen.getByRole("button", { name: scene.resetView })
    expect(button).toHaveAttribute("title", scene.resetViewHint)
    await userEvent.setup().click(button)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("se pose au-dessus de l'aide de l'accueil, en bas à droite", () => {
    const { wrapper } = setup(true, "landing")
    expect(wrapper).toHaveClass("right-5", "bottom-[60px]", "lg:bottom-[52px]")
  })

  it("en conversation, ne s'affiche qu'à droite du panneau sur grand écran", () => {
    const { wrapper } = setup(true, "chat")
    expect(wrapper).toHaveClass("hidden", "lg:block", "bottom-6")
  })

  it("est traduit en anglais", () => {
    expect(DICTIONARIES.en.scene.resetView).toBe("reset view")
    expect(DICTIONARIES.en.scene.resetViewHint).toBeTruthy()
  })
})
