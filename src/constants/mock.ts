interface IMockRule {
  pattern: RegExp
  response: string
}

export const MOCK_RULES: IMockRule[] = [
  {
    pattern: /^(bonjour|salut|hello|coucou|hi|hey)[\s!?.]*$/i,
    response: "Salut ! 👋 Comment puis-je t'aider ?",
  },
  {
    pattern: /comment.*(va|tu vas|vous allez)|ça va\??/i,
    response: "Je vais très bien, merci ! Et toi, comment puis-je t'aider ?",
  },
  {
    pattern: /qui es.tu|tu es qui|c'est qui|présente.toi/i,
    response: "Je suis l'IA de Damien : Product Builder & architecte IA, avec un solide socle Lead Tech JS (React, Next.js). Pose-moi tes questions !",
  },
  {
    pattern: /compétence|skill|stack|technolog|maîtris/i,
    response: "Damien maîtrise Next.js, TypeScript, React, Node.js, les LLMS les plus récents et Qdrant. Un vrai couteau suisse du web moderne !",
  },
  {
    pattern: /projet|réalisation|portfolio|travaux/i,
    response: "Damien conçoit des produits de bout en bout : applications IA (RAG, embeddings, Qdrant), architectures micro-services robustes et interfaces React haute performance.",
  },
  {
    pattern: /travail|boulot|emploi|poste|recru|disponible/i,
    response: "Damien est ouvert aux opportunités stimulantes. N'hésite pas à le contacter directement !",
  },
  {
    pattern: /expérience|parcours|cv|historique/i,
    response: "Damien a plusieurs années d'expérience en développement front-end et full-stack (React, Next.js), un socle de Lead Tech JS sur lequel il construit aujourd'hui des produits et des architectures IA.",
  },
  {
    pattern: /merci|thanks|super|cool|génial|top|parfait/i,
    response: "Avec plaisir ! N'hésite pas si tu as d'autres questions. 😊",
  },
  {
    pattern: /au revoir|bye|ciao|bonne journée|à bientôt|tchao/i,
    response: "À bientôt ! 👋 N'hésite pas à revenir.",
  },
  {
    pattern: /aide|help|quoi|que faire|comment/i,
    response: "Tu peux me demander des infos sur les compétences, projets ou l'expérience de Damien. Je suis là pour t'aider !",
  },
]

export const DEFAULT_MOCK_RESPONSE = "Bonne question ! Damien serait ravi d'en discuter directement avec toi. En attendant, sens-toi libre de me poser d'autres questions sur son parcours."
