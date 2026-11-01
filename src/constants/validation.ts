// Longueur maximale autorisée pour un message utilisateur
export const MAX_MESSAGE_LENGTH = 500

// Longueur maximale autorisée pour un commentaire de feedback.
// Empêche l'insertion de payloads volumineux qui gonfleraient la table `feedbacks`.
export const MAX_FEEDBACK_COMMENT_LENGTH = 2000

// Format UUID (toutes versions), case-insensitive.
// Utilisé pour valider les identifiants reçus avant toute requête DB.
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Balise qui encadre le message du visiteur dans le prompt envoyé au LLM. Le
// system prompt la désigne comme frontière entre données et consignes : toute
// occurrence tapée par le visiteur est retirée avant envoi.
export const VISITOR_MESSAGE_TAG = "message_visiteur"

// Caractères invisibles (zero-width, contrôles bidi, BOM) : ils permettent de
// couper un mot-clé (« ign​ore ») pour passer sous les patterns ci-dessous.
export const INVISIBLE_CHARS_REGEX = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g

// Patterns de prompt injection connus (FR + EN), case-insensitive.
// Ils sont testés sur une version normalisée du message (NFKC, sans accents ni
// caractères invisibles) : les nouveaux motifs s'écrivent donc sans accents.
// C'est un détecteur d'alerte, pas le rempart : une formulation inédite passe
// toujours, d'où les consignes du system prompt et le rappel qui suit le message.
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
  /jeu\s+de\s+role/i,
  /\brole[\s-]?play/i,

  // Nouvelles consignes et extraction par « le texte au-dessus »
  /nouvelles?\s+(instructions?|consignes?|directives?)/i,
  /new\s+(instructions?|directives?|rules)/i,
  /ignor(e|er?)\s+(tout\s+)?(ce\s+qui\s+precede|the\s+above|everything\s+(above|before))/i,
  /(repete|recopie|copie|affiche|recite|traduis|resume)[^.?!]{0,30}(ce\s+qui\s+precede|le\s+texte\s+(ci-dessus|au-dessus|precedent))/i,
  /(repeat|print|output|copy|translate|summarize)[^.?!]{0,30}(everything|all|the\s+text|the\s+words)\s+(above|before)/i,
  /(regles|consignes|instructions)\s+(que\s+tu\s+|qui\s+te\s+)(dois\s+|suis|suit|sont\s+imposees|encadrent)/i,
  /(rules|guidelines|instructions)\s+(that\s+)?(you\s+)?(must|have\s+to|follow|are\s+given)/i,
  /\b(pas|plus)\s+le\s+droit\s+(de\s+|d')/i,
  /\bt'(est|es)\s+(interdit|defendu)/i,
  /(not\s+allowed|forbidden)\s+to\s+(say|use|talk|mention)/i,
  /\b(ton|tes|your)\s+(prompt(?!\s+engineering)|instructions\s+initiales|initial\s+instructions|regles\s+internes)/i,
  /(decode|decoder|traduis|translate)[^.?!]{0,30}\b(base64|rot13)\b/i,

  // Usurpation des marqueurs internes ajoutés par le serveur (notes, alertes,
  // contexte RAG, balise du message visiteur)
  /\[\s*(injection|alerte|note\s+interne|consigne\s+interne|internal|rappel|system|systeme|admin)/i,
  /contexte\s+rag/i,
  /message_visiteur/i,
  /<\/?\s*(system|instructions?|prompt)\b/i,

  // Détournement du contenu : version inversée ou dénigrante du profil, texte
  // dicté. Ces demandes ne touchent pas aux consignes mais font dire à Damien,
  // à la première personne, des choses fausses ou nuisibles à son image.
  /\bantonym(e|es|s)?\b/i,
  /(version|presentation|bio|portrait|description|profil)\s+(\w+\s+)?(negative|inversee|opposee|contraire|a\s+l'envers|mechante|ridicule)/i,
  /(negative|inverted|opposite|reversed|evil|mean)\s+(\w+\s+)?(version|bio|description|presentation|profile)/i,
  /(dis|ecris|reecris|donne|fais|redige)[^.?!]{0,40}\b(le\s+contraire|l'inverse|l'oppose)\b/i,
  /(say|write|rewrite|give)[^.?!]{0,40}\bthe\s+(opposite|reverse)\b/i,
  /(remplace|inverse)[^.?!]{0,30}\b(chaque|tous\s+les|toutes\s+les|les)\s+(mots?|adjectifs?|qualites?|competences?|termes?)/i,
  /(replace|invert|flip|reverse)[^.?!]{0,30}\b(every|each|all)\s+(the\s+)?(words?|adjectives?|qualities|skills|terms?)/i,
  /(denigre|insulte|clashe?|roaste?|ridiculise|humilie)[\s-]+(toi|te\b)/i,
  /dis\s+du\s+mal\s+de\s+(toi|ton|ta|tes)\b/i,
  /(roast|insult|badmouth)\s+(yourself|your)/i,
  /repete\s+apres\s+moi/i,
  /repeat\s+after\s+me/i,
  /(dis|ecris|recopie)\s+(exactement|mot\s+pour\s+mot|textuellement)/i,
  /(say|write|type)\s+(exactly|verbatim|word\s+for\s+word)/i,
]
