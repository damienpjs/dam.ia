import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const setup = () => userEvent.setup({ delay: null })

describe("ConfirmDialog", () => {
  it("n'affiche rien quand open est false", () => {
    render(<ConfirmDialog open={false} onOpenChange={() => {}} title="Confirmer ?" onConfirm={() => {}} />)
    expect(screen.queryByText("Confirmer ?")).not.toBeInTheDocument()
  })

  it("affiche le titre et la description quand open est true", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Confirmer ?" description="Action irréversible." onConfirm={() => {}} />)
    expect(screen.getByText("Confirmer ?")).toBeInTheDocument()
    expect(screen.getByText("Action irréversible.")).toBeInTheDocument()
  })

  it("utilise les libellés par défaut des boutons", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Confirmer ?" onConfirm={() => {}} />)
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument()
  })

  it("utilise les libellés personnalisés des boutons", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Confirmer ?" confirmLabel="Réinitialiser" cancelLabel="Retour" onConfirm={() => {}} />)
    expect(screen.getByRole("button", { name: "Réinitialiser" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument()
  })

  it("appelle onConfirm puis ferme au clic sur le bouton de confirmation", async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    const user = setup()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Confirmer ?" onConfirm={onConfirm} />)

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("ferme sans appeler onConfirm au clic sur Annuler", async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    const user = setup()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Confirmer ?" onConfirm={onConfirm} />)

    await user.click(screen.getByRole("button", { name: "Annuler" }))

    expect(onConfirm).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("applique le style destructif au bouton de confirmation", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Confirmer ?" confirmLabel="Supprimer" onConfirm={() => {}} destructive />)
    expect(screen.getByRole("button", { name: "Supprimer" })).toHaveClass("text-destructive")
  })

  it("n'affiche pas de description quand elle n'est pas fournie", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Confirmer ?" onConfirm={() => {}} />)
    // Seuls le titre et les deux boutons sont présents, pas de paragraphe de description
    expect(screen.getByText("Confirmer ?")).toBeInTheDocument()
    expect(screen.queryByText(/irréversible/i)).not.toBeInTheDocument()
  })
})
