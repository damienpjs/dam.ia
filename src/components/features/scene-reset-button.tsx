import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TSceneLayout } from "@/constants/scene"

interface ISceneResetButtonProps {
  visible: boolean
  layout: TSceneLayout
  label: string
  /** Infobulle : le libellé visible reste le nom accessible du bouton. */
  hint: string
  onReset: () => void
}

/**
 * Recadrage, en bas à droite de la scène, seulement une fois la caméra
 * tournée ou zoomée. Sur l'accueil il se pose au-dessus de l'aide « clic-glissé » ;
 * en conversation, sur mobile, le panneau couvre la scène : il disparaît.
 */
export function SceneResetButton({ visible, layout, label, hint, onReset }: ISceneResetButtonProps) {
  return (
    <div
      data-testid="scene-reset"
      inert={!visible}
      className={cn(
        "fixed right-5 z-30 transition-opacity duration-300 lg:right-16",
        layout === "chat" ? "bottom-6 hidden lg:block" : "bottom-[60px] lg:bottom-[52px]",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Button variant="outline" size="sm" onClick={onReset} title={hint} className="bg-paper">
        <span aria-hidden="true">↺</span>
        {label}
      </Button>
    </div>
  )
}
