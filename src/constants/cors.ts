/**
 * Configuration du contrôle d'origine (CORS) pour les routes API d'écriture.
 */

// Domaine de production du site, autorisé par défaut en plus du same-origin.
export const PRODUCTION_ORIGIN = "https://damienpasulj.com"

// Variable d'env (CSV) permettant d'ajouter des origines autorisées
// (ex. previews, domaines partenaires). Surcharge la liste par défaut.
export const ALLOWED_ORIGINS_ENV = "ALLOWED_ORIGINS"

// Méthodes et en-têtes exposés via les réponses CORS / preflight.
export const CORS_ALLOW_METHODS = "POST, OPTIONS"
export const CORS_ALLOW_HEADERS = "Content-Type"
