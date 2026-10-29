/**
 * Dynamique du second ordre (ressort amorti), pour animer le personnage comme
 * on anime à la main : départ avec anticipation, arrivée qui dépasse un peu
 * puis se pose, au lieu d'un fondu linéaire.
 *
 * Paramètres :
 * - `f` : fréquence propre (Hz), la vitesse de réaction ;
 * - `zeta` : amortissement ; < 1 dépasse la cible et oscille, 1 arrive sans
 *   dépasser, > 1 traîne ;
 * - `r` : réponse initiale ; 0 démarre en douceur, > 1 part en avance,
 *   < 0 anticipe (part d'abord dans l'autre sens).
 *
 * y + k1·y' + k2·y'' = x + k3·x', intégré en Euler semi-implicite, avec un
 * k2 borné pour rester stable quel que soit le pas de temps.
 */

export interface ISpringParams {
  f: number
  zeta: number
  r: number
}

/** Pas maximal d'intégration (s) : au-delà, on découpe en sous-pas. */
export const MAX_STEP_S = 1 / 120

/** Au retour d'un onglet en arrière-plan, on ne rattrape pas plus que ça (s). */
export const MAX_DT_S = 0.1

function constants({ f, zeta, r }: ISpringParams): [number, number, number] {
  const w = 2 * Math.PI * f
  return [zeta / (Math.PI * f), 1 / (w * w), (r * zeta) / w]
}

/** Ressort sur un vecteur de dimension quelconque (1 pour un scalaire). */
export class SecondOrder {
  readonly y: number[]
  readonly v: number[]
  private readonly xPrev: number[]
  private k: [number, number, number]

  constructor(params: ISpringParams, initial: readonly number[]) {
    this.k = constants(params)
    this.y = [...initial]
    this.v = initial.map(() => 0)
    this.xPrev = [...initial]
  }

  /** Repart immobile sur `value` (téléportation, premier affichage). */
  reset(value: readonly number[]): void {
    for (let i = 0; i < this.y.length; i++) {
      this.y[i] = value[i]
      this.v[i] = 0
      this.xPrev[i] = value[i]
    }
  }

  /**
   * Déplace tout le ressort (position et consigne précédente) de `delta` :
   * il suit un repère qui bouge sans prendre de retard, et sa vitesse propre
   * n'en est pas affectée.
   */
  shift(delta: readonly number[]): void {
    for (let i = 0; i < this.y.length; i++) {
      this.y[i] += delta[i]
      this.xPrev[i] += delta[i]
    }
  }

  /** Change de tempo sans perdre la position ni la vitesse. */
  retune(params: ISpringParams): void {
    this.k = constants(params)
  }

  /** Avance de `dt` secondes vers la cible `x` ; renvoie la position. */
  update(dt: number, x: readonly number[]): number[] {
    const total = Math.min(Math.max(dt, 0), MAX_DT_S)
    if (total <= 0) return this.y
    const steps = Math.max(1, Math.ceil(total / MAX_STEP_S))
    const h = total / steps
    const [k1, k2, k3] = this.k
    const k2s = Math.max(k2, (h * h) / 2 + (h * k1) / 2, h * k1)
    for (let i = 0; i < this.y.length; i++) {
      // vitesse de la cible, estimée sur le pas complet
      const xd = (x[i] - this.xPrev[i]) / total
      for (let s = 0; s < steps; s++) {
        this.y[i] += h * this.v[i]
        this.v[i] += (h * (x[i] + k3 * xd - this.y[i] - k1 * this.v[i])) / k2s
      }
      this.xPrev[i] = x[i]
    }
    return this.y
  }
}

/** Réglages du personnage : chaque partie du corps a son tempo. */
export const SPRINGS = {
  /**
   * Cible du poignet : arc franc, léger dépassement. Pas d'anticipation par r < 0 :
   * la consigne saute d'une cible à l'autre, et un saut fait réagir ce terme d'un coup.
   */
  hand: { f: 1.5, zeta: 0.62, r: 0 },
  /** Cible du poignet quand la main vient toucher le visage ou la hanche : pas de dépassement. */
  handContact: { f: 1.4, zeta: 1, r: 0 },
  /** Poids de l'IK : entre et sort sans rebond. */
  weight: { f: 1.3, zeta: 1, r: 0 },
  /** Direction du coude. */
  pole: { f: 1.4, zeta: 0.85, r: 0 },
  /** Rotation de l'avant-bras : en retard sur la main (chevauchement). */
  twist: { f: 1.1, zeta: 0.7, r: 0 },
  /** Pli du poignet : suit l'avant-bras avec un léger retard. */
  wrist: { f: 1.2, zeta: 0.8, r: 0 },
  /** Forme de la main : les doigts se posent après le poignet. */
  fingers: { f: 0.95, zeta: 0.85, r: 0 },
  /** Tête : suit le regard avec un temps de retard. */
  head: { f: 1.2, zeta: 0.78, r: 0 },
} satisfies Record<string, ISpringParams>
