"use client"

import type { ReactElement, ReactNode } from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

type TTooltipSide = "top" | "bottom" | "left" | "right"

interface ITooltipProps {
  /** Élément déclencheur (typiquement un bouton). */
  children: ReactElement
  /** Contenu affiché dans l'infobulle. */
  content: ReactNode
  /** Côté d'affichage par rapport au déclencheur. */
  side?: TTooltipSide
  /** Décalage en px entre le déclencheur et l'infobulle. */
  sideOffset?: number
  /** Délai avant ouverture (ms). */
  delay?: number
}

export function Tooltip({ children, content, side = "top", sideOffset = 8, delay = 300 }: ITooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={delay} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 max-w-xs rounded-lg bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border/60 backdrop-blur-sm",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
