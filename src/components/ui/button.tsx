import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Boutons de la charte papier : angles droits, aucune ombre. Le bouton
// principal reprend l'aplat teal du CV (texte à l'encre, 9,9:1) et passe à
// l'encre au survol ; le secondaire n'est qu'un filet au contraste des
// contrôles (3,9:1 sur le papier).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border border-transparent font-mono text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-teal-ink disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-rule disabled:bg-transparent disabled:text-control [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-teal font-bold text-ink hover:bg-ink hover:text-paper",
        outline: "border-control bg-transparent text-body hover:border-teal-ink hover:text-ink",
        secondary: "bg-rule text-ink hover:bg-ink hover:text-paper",
        ghost: "text-body hover:text-ink hover:underline hover:underline-offset-4",
        destructive: "bg-coral font-bold text-ink hover:bg-ink hover:text-paper",
        link: "text-teal-ink underline underline-offset-4 hover:text-ink",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-5",
        icon: "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
