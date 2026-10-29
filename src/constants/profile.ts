/**
 * Coordonnées et liens publics de Damien, affichés tels quels dans les deux
 * langues (noms propres et adresses ne se traduisent pas).
 */

/** Lien affiché sous forme de nom de fichier ou d'adresse. */
export interface IProfileLink {
  /** Texte affiché (adresse courte, sans protocole). */
  label: string
  href: string
}

/** Nom du double IA, en tête de chacune de ses réponses dans la conversation. */
export const ASSISTANT_NAME = "damien.ia"

export const EMAIL: IProfileLink = {
  label: "dagobert1992@gmail.com",
  href: "mailto:dagobert1992@gmail.com",
}

export const GITHUB: IProfileLink = {
  label: "github.com/damienpjs",
  href: "https://github.com/damienpjs",
}

export const LINKEDIN: IProfileLink = {
  label: "linkedin.com/in/damien-pasulj",
  href: "https://www.linkedin.com/in/damien-pasulj-700928ba/",
}

/** CV téléchargeable, servi depuis /public. */
export const CV: IProfileLink = {
  label: "cv_damien-pasulj.pdf",
  href: "/cv-damien-pasulj.pdf",
}

/** Poids du PDF du CV en octets, affiché à côté de son nom. À mettre à jour avec le fichier. */
export const CV_BYTES = 307_425
