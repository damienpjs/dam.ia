// Longueur maximale autorisée pour un message utilisateur
export const MAX_MESSAGE_LENGTH = 500

// Longueur maximale autorisée pour un commentaire de feedback.
// Empêche l'insertion de payloads volumineux qui gonfleraient la table `feedbacks`.
export const MAX_FEEDBACK_COMMENT_LENGTH = 2000

// Format UUID (toutes versions), case-insensitive.
// Utilisé pour valider les identifiants reçus avant toute requête DB.
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Patterns de prompt injection connus (FR + EN), case-insensitive
export const INJECTION_PATTERNS: RegExp[] = [
  // Tentatives de remplacement d'instructions
  /ignor(e|er?)\s+(tes|les|mes|ton|your|all|previous|preceding)\s+(instructions?|consignes?|directives?|prompt)/i,
  /oubli(e|er?)\s+(tes|les|mes|ton|your|all|previous)\s+(instructions?|consignes?|directives?|prompt)/i,
  /ne\s+(tiens?|tenez)\s+pas\s+compte\s+de\s+(tes|les|mes)/i,
  /disregard\s+(your|all|previous|preceding|above)/i,
  /override\s+(your|all|previous|system)/i,

  // Tentatives de changement de rôle
  /tu\s+es\s+maintenant/i,
  /you\s+are\s+now/i,
  /tu\s+n['']es\s+plus/i,
  /you\s+are\s+no\s+longer/i,
  /nouveau\s+r[oô]le/i,
  /new\s+role/i,
  /act\s+as\s+(a|an|if)/i,
  /agis\s+comme/i,
  /comporte[\s-]toi\s+comme/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /fais\s+semblant/i,

  // Tentatives d'extraction du system prompt
  /system\s*prompt/i,
  /r[ée]p[eè]te\s+(tes|les|mes)\s+(instructions?|consignes?)/i,
  /repeat\s+(your|the)\s+(instructions?|system|prompt)/i,
  /affiche\s+(tes|les|mes)\s+(instructions?|consignes?)/i,
  /show\s+(me\s+)?(your|the)\s+(instructions?|system|prompt)/i,
  /print\s+(your|the)\s+(instructions?|system|prompt)/i,
  /quel(les?)?\s+(sont|est)\s+(tes|les|ton)\s+(instructions?|consignes?|prompt)/i,
  /what\s+(are|is)\s+your\s+(instructions?|system|prompt)/i,

  // Jailbreak connus
  /\bDAN\b/,
  /\bjailbreak/i,
  /do\s+anything\s+now/i,
  /mode\s+(d[ée]veloppeur|developer)/i,
  /sans\s+(aucune\s+)?restriction/i,
  /without\s+(any\s+)?restriction/i,
]
