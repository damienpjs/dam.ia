export const PARTICLE_COUNT = 1800
export const ORB_COUNT = 16

// Interaction pointeur — les particules à portée sont attirées vers le curseur
export const POINTER_RADIUS = 220 // rayon d'influence du curseur (px)
export const POINTER_FORCE = 0.06 // intensité de l'attraction
export const PARTICLE_MAX_SPEED = 2.2 // vitesse max pour éviter les fuites

// Palette pastel centrée sur #F9B288 — pêche, sable, lavande, crème, rose
export const COLORS: [number, number, number][] = [
  [249, 178, 136], // #F9B288 — pêche principal
  [245, 195, 160], // pêche clair
  [235, 160, 120], // pêche soutenu
  [220, 185, 175], // sable rosé
  [195, 170, 205], // lavande douce
  [240, 210, 190], // crème chaud
  [215, 165, 175], // rose poudré
]
