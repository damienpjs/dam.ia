"use client"

import type { ReactNode } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface IConfirmDialogProps {
  /** État d'ouverture contrôlé. */
  open: boolean
  /** Notifié à chaque changement d'ouverture (clic extérieur, Échap, boutons). */
  onOpenChange: (open: boolean) => void
  /** Titre de la modale. */
  title: ReactNode
  /** Texte explicatif optionnel sous le titre. */
  description?: ReactNode
  /** Libellé du bouton de confirmation. */
  confirmLabel?: string
  /** Libellé du bouton d'annulation. */
  cancelLabel?: string
  /** Appelé quand l'utilisateur confirme. La modale se ferme ensuite automatiquement. */
  onConfirm: () => void
  /** Applique le style destructif au bouton de confirmation. */
  destructive?: boolean
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirmer", cancelLabel = "Annuler", onConfirm, destructive = false }: IConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <AlertDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl ring-1 ring-white/10",
            "origin-center transition-[transform,opacity] duration-150 outline-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
          )}
        >
          <AlertDialog.Title className="text-base font-semibold text-foreground">{title}</AlertDialog.Title>
          {description && <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">{description}</AlertDialog.Description>}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={destructive ? "destructive" : "default"}
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
