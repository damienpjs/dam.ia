import { sendGAEvent } from "@next/third-parties/google"

/**
 * Noms des événements GA4 émis par le site.
 *
 * Contraintes GA4 respectées ici : snake_case, 40 caractères maximum, début par
 * une lettre, aucun préfixe réservé (`google_`, `ga_`, `firebase_`) et aucune
 * collision avec les événements collectés automatiquement (`page_view`,
 * `session_start`, `scroll`, `click`…).
 */
export type TAnalyticsEvent =
  | "chat_opened"
  | "chat_closed"
  | "chat_message_sent"
  | "suggestion_clicked"
  | "chat_response_completed"
  | "chat_response_error"
  | "chat_source_clicked"
  | "chat_message_copied"
  | "chat_message_reused"
  | "chat_reset"
  | "about_link_clicked"
  | "about_cta_clicked"
  | "locale_changed"

/**
 * Paramètres joints à un événement.
 *
 * Jamais de contenu de conversation ici : GA4 interdit les données
 * personnelles, et le texte libre en contient tôt ou tard. On s'en tient à des
 * valeurs de cardinalité fermée (libellés, statuts, compteurs).
 */
export type TAnalyticsParams = Record<string, string | number | boolean>

/**
 * Émet un événement GA4.
 *
 * Sans `NEXT_PUBLIC_GA_ID`, aucun script n'est chargé (voir `layout.tsx`) :
 * l'appel est donc ignoré silencieusement en développement, dans les tests et
 * sur les déploiements de prévisualisation. Ce garde-fou centralisé évite d'en
 * répéter un dans chaque composant.
 */
export function trackEvent(event: TAnalyticsEvent, params?: TAnalyticsParams): void {
  if (!process.env.NEXT_PUBLIC_GA_ID) return
  sendGAEvent("event", event, params ?? {})
}
