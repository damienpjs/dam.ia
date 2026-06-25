/**
 * Technologies que Damien maîtrise, affichées en étiquettes sur la landing.
 *
 * Chaque techno porte un (ou plusieurs) petit logo affiché avant son nom.
 * Le cas multi-logos sert à la « Suite Adobe » : les icônes des apps
 * principales (Ps, Ai, Id, Pr, Ae) se chevauchent légèrement dans l'étiquette.
 */
export interface ITech {
  /** Nom affiché dans l'étiquette. */
  name: string
  /** Logo(s) PNG affichés avant le nom (chemins relatifs à /public). */
  logos: string[]
}

export const TECHS: ITech[] = [
  { name: "TypeScript", logos: ["/logos/typescript.png"] },
  { name: "Next.js", logos: ["/logos/nextjs.png"] },
  { name: "Qdrant", logos: ["/logos/qdrant.png"] },
  { name: "C#", logos: ["/logos/csharp.png"] },
  { name: "Claude", logos: ["/logos/claude.png"] },
  { name: "GitLab CI/CD", logos: ["/logos/gitlab.png"] },
  { name: "ComfyUI", logos: ["/logos/comfyui.png"] },
  { name: "Blender", logos: ["/logos/blender.png"] },
  {
    name: "Adobe",
    logos: ["/logos/adobe-photoshop.png", "/logos/adobe-illustrator.png", "/logos/adobe-indesign.png", "/logos/adobe-premiere.png", "/logos/adobe-aftereffects.png"],
  },
]

/** Nombre d'étiquettes visibles avant le bouton « voir X plus ». */
export const TECHS_VISIBLE_COUNT = 9
