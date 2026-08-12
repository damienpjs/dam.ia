import { DEFAULT_LOCALE, type TLocale } from "@/constants/i18n"

/**
 * Dictionnaires de traduction du contenu affiché (FR / EN).
 *
 * Tout texte visible par le visiteur vit ici — jamais en dur dans un composant —
 * afin qu'ajouter une langue se résume à ajouter une entrée dans
 * {@link DICTIONARIES}. Les noms propres (technos, entreprises, écoles) ne sont
 * pas traduits.
 */

/** Une étape du parcours professionnel ou de formation. */
export interface ITimelineEntry {
  period: string
  role: string
  org: string
  description: string
  stack?: string[]
  current?: boolean
}

/** Un groupe de compétences affiché en colonne sur la page « à propos ». */
export interface ISkillGroup {
  label: string
  items: string[]
}

/**
 * Identifiants stables des suggestions de questions.
 *
 * Les suggestions déjà utilisées sont mémorisées en localStorage : on y stocke
 * ces identifiants et non le libellé, sinon changer de langue les ferait toutes
 * réapparaître.
 */
export const SUGGESTION_IDS = ["skills", "softSkills", "background", "hobbies", "remote", "languages"] as const

export type TSuggestionId = (typeof SUGGESTION_IDS)[number]

export interface IDictionary {
  common: {
    /** Libellé du groupe de boutons du sélecteur de langue. */
    languageLabel: string
    /** Nom de chaque langue, pour l'accessibilité des boutons. */
    localeNames: Record<TLocale, string>
  }
  landing: {
    greeting: string
    /** Terme mis en exergue (dégradé animé) à la fin de l'accroche. */
    greetingHighlight: string
    startConversation: string
    startConversationAria: string
    aboutLink: string
    /** Bouton révélant les technos masquées (« voir 3 + »). */
    showMoreTechs: (count: number) => string
  }
  chat: {
    /** Bulle d'accueil (markdown) — jamais persistée, elle suit la langue courante. */
    welcome: string
    suggestionsLabel: string
    suggestions: Record<TSuggestionId, string>
    /** Phrases de « réflexion » tapées lettre par lettre en attendant la réponse. */
    thinkingPhrases: string[]
    thinkingAria: string
    loadingSession: string
    inputPlaceholder: string
    inputAria: string
    send: string
    sendAria: string
    reset: string
    resetDialogTitle: string
    resetDialogDescription: string
    resetConfirm: string
    resetCancel: string
    streamError: string
    sourcesLabel: string
    copy: string
    copied: string
    reuse: string
    providerAvailable: string
    providerUnavailable: string
    /** Libellés d'affichage des providers LLM (seul « Démo » se traduit). */
    providerLabels: Record<string, string>
  }
  scene: {
    /** Répliques de la bulle BD au-dessus du personnage 3D. */
    bubbleLines: string[]
  }
  about: {
    eyebrow: string
    titleLead: string
    titleHighlight: string
    intro: string
    storyLabel: string
    story: string[]
    careerLabel: string
    timeline: ITimelineEntry[]
    currentBadge: string
    skillsLabel: string
    skillGroups: ISkillGroup[]
    beyondCodeLabel: string
    beyondCodeIntro: string
    interests: string[]
    philosophyLabel: string
    philosophy: string
    ctaQuestion: string
    ctaLink: string
  }
}

const FR: IDictionary = {
  common: {
    languageLabel: "Langue",
    localeNames: { fr: "Français", en: "Anglais" },
  },
  landing: {
    greeting: "Salut ! Moi c'est ",
    greetingHighlight: "Damien.",
    startConversation: "Démarrer la conversation",
    startConversationAria: "Commencer la conversation",
    aboutLink: "À propos",
    showMoreTechs: (count) => `voir ${count} +`,
  },
  chat: {
    welcome: "👋 **Product Builder** & **enthousiaste IA** (avec un solide socle en **Technical Lead JS**). On peut parler de mon parcours, mes projets, mes loisirs ou mes passions ;)",
    suggestionsLabel: "Suggestions :",
    suggestions: {
      skills: "Quelles sont tes compétences ?",
      softSkills: "Parle-moi de tes soft skills",
      background: "Quel est ton parcours ?",
      hobbies: "Quels sont tes loisirs et passions ?",
      remote: "Que penses-tu du full remote ?",
      languages: "Quelles langues parles-tu ?",
    },
    thinkingPhrases: [
      "Hallucination en cours",
      "Damien filozofe",
      "Damien compile une réponse pas trop nulle",
      "Damien tergiverse avec classe",
      "Poignée de main secrète cognitive",
      "Égarement dans le bruit latent de l'espace vide",
      "Damien essaye de créer un lien humain",
      "Réflexion en cours dans le phosphor",
    ],
    thinkingAria: "Damien réfléchit",
    loadingSession: "Chargement de la conversation…",
    inputPlaceholder: "Écris ton message…",
    inputAria: "Message à envoyer",
    send: "Envoyer le message",
    sendAria: "Envoyer",
    reset: "Réinitialiser la conversation",
    resetDialogTitle: "Réinitialiser la conversation ?",
    resetDialogDescription: "Tous les messages échangés seront définitivement effacés. Cette action est irréversible.",
    resetConfirm: "Réinitialiser",
    resetCancel: "Annuler",
    streamError: "Désolé, une erreur est survenue. Réessaie !",
    sourcesLabel: "Sources",
    copy: "Copier le message",
    copied: "Copié",
    reuse: "Renvoyer ce message",
    providerAvailable: "disponible",
    providerUnavailable: "indisponible",
    providerLabels: { gemini: "Gemini", groq: "Groq", mock: "Démo" },
  },
  scene: {
    bubbleLines: ["Comment tu sais que je suis né dans les 90's ?", "Cette chemise ? Un choix tout à fait assumé.", "Où est-ce que je me suis encore perdu ?"],
  },
  about: {
    eyebrow: "À propos",
    titleLead: "Product Builder & ",
    titleHighlight: "enthousiaste IA",
    intro:
      "Je m'appelle Damien Pasulj. Je conçois et construis des produits web, avec douze ans d'expérience en front-end et en full-stack, ancré sur un solide socle de Technical Lead JavaScript — avec en filigrane une sensibilité esthète forgée à l'école de design.",
    storyLabel: "Le fil rouge",
    story: [
      "Tout a commencé à l'IDEM, une école de design où j'étudiais l'ergonomie, l'apparence et l'identité visuelle des sites. Ce qui fait qu'un site fonctionne — ou pas — d'un point de vue marketing. Passionné d'interfaces et de technologies depuis toujours, j'ai aussi un côté esthète : j'aime concevoir des choses, initialement inertes, et leur donner vie sur le web.",
      "Mais la surface ne suffisait pas. Je voulais comprendre l'envers du décor — comment on passe d'une maquette à un site en ligne. Cette curiosité m'a conduit à mêler une année de design d'interface à une année de développement : une double sensibilité UI/UX et technique qui irrigue encore tout mon travail.",
      "Pendant dix ans chez elloha, j'ai grandi avec le produit : des premiers sites touristiques sous CMS jusqu'à la refonte complète du cœur de l'application en React, TypeScript et Next.js, que j'ai eu la chance de mener en tant que lead. Aujourd'hui, chez Apizee, je continue sur cette voie — architecture front-end, CI/CD et accompagnement d'équipe.",
      "En parallèle, l'IA générative est devenue un terrain de jeu et d'exploration : LLM, RAG, embeddings. Ce site en est d'ailleurs une démonstration — mon « double IA » répond à votre place pour parler de mon parcours.",
    ],
    careerLabel: "Parcours",
    timeline: [
      {
        period: "2024 — présent",
        role: "Lead React / TypeScript / Next.js",
        org: "Apizee",
        description: "Lead technique sur le cœur de produit, définition de l'architecture front-end et des bonnes pratiques, mise en place de pipelines GitLab CI/CD et encadrement de l'équipe.",
        stack: ["React", "TypeScript", "Next.js", "GitLab CI/CD"],
        current: true,
      },
      {
        period: "2022 — 2024",
        role: "Lead refonte du cœur de produit",
        org: "elloha",
        description: "Pilotage de la refonte complète du produit en React, TypeScript et Next.js. Migration progressive depuis l'ancienne stack ASP.NET/C# et montée en compétences de l'équipe.",
        stack: ["React", "TypeScript", "Next.js"],
      },
      {
        period: "2017 — 2022",
        role: "Développeur front-end",
        org: "elloha",
        description: "Développement et maintenance de la web application principale en ASP.NET/C#. Acquisition d'une expertise solide sur les problématiques métier du secteur touristique.",
        stack: ["ASP.NET", "C#"],
      },
      {
        period: "2014 — 2017",
        role: "Développeur web",
        org: "elloha",
        description: "Création de sites web sous le CMS DotNetNuke pour des destinations touristiques majeures — collioure.com, tourismegard.com, morbihan.com, et bien d'autres.",
        stack: ["DotNetNuke", "Front-end web"],
      },
      {
        period: "2012 — 2014",
        role: "Formation UI/UX & développement web",
        org: "L'IDEM — École Supérieure des Métiers Créatifs et Numériques",
        description: "Une première année dédiée au design d'interface et à l'expérience utilisateur, une seconde au développement web. La double compétence qui irrigue encore tout mon travail.",
      },
    ],
    currentBadge: "Actuel",
    skillsLabel: "Compétences",
    skillGroups: [
      { label: "Stack principale", items: ["React", "TypeScript", "Next.js", "Node.js"] },
      { label: "DevOps", items: ["GitLab CI/CD", "Git", "Architecture front-end"] },
      { label: "IA & RAG", items: ["LLM (Claude, OpenAI, Gemini)", "RAG", "Embeddings", "Qdrant"] },
      { label: "Design & identité visuelle", items: ["UI/UX", "Photoshop", "Illustrator", "InDesign", "After Effects", "Premiere Pro"] },
      { label: "Historique", items: ["ASP.NET / C# (5+ ans)", "DotNetNuke"] },
      { label: "Soft skills", items: ["Organisation", "Travail d'équipe", "Good vibes", "Créativité"] },
    ],
    beyondCodeLabel: "En dehors du code",
    beyondCodeIntro: "Basé dans les Pyrénées-Orientales, je travaille en full remote. Français langue maternelle, anglais courant. En dehors de l'écran, je nourris ma curiosité autrement.",
    interests: ["Voyages", "Sport", "Philosophie", "Dessin"],
    philosophyLabel: "Philosophie",
    philosophy:
      "Quelle que soit la mission, l'objectif reste le même : trouver le meilleur compromis entre élégance, rapidité et durabilité. Rester léger, ne pas accumuler de dette technique, choisir les pratiques les mieux adaptées au projet — et livrer quelque chose dont on est fier.",
    ctaQuestion: "Envie d'en savoir plus sur mon parcours, mes projets ou mes passions ?",
    ctaLink: "Discute avec mon double IA",
  },
}

const EN: IDictionary = {
  common: {
    languageLabel: "Language",
    localeNames: { fr: "French", en: "English" },
  },
  landing: {
    greeting: "Hi there! I'm ",
    greetingHighlight: "Damien.",
    startConversation: "Start the conversation",
    startConversationAria: "Start the conversation",
    aboutLink: "About",
    showMoreTechs: (count) => `${count} more`,
  },
  chat: {
    welcome: "👋 **Product Builder** & **AI enthusiast** (with a solid **JS Tech Lead** foundation). We can talk about my background, my projects, my hobbies or my passions ;)",
    suggestionsLabel: "Suggestions:",
    suggestions: {
      skills: "What are your skills?",
      softSkills: "Tell me about your soft skills",
      background: "What's your background?",
      hobbies: "What are your hobbies and passions?",
      remote: "How do you feel about full remote?",
      languages: "Which languages do you speak?",
    },
    thinkingPhrases: [
      "Hallucinating in progress",
      "Damien philosophizes",
      "Damien is compiling a not-too-lame answer",
      "Damien is stalling, elegantly",
      "Secret cognitive handshake",
      "Wandering off into the latent noise of empty space",
      "Damien is attempting a human connection",
      "Thinking, somewhere in the phosphor",
    ],
    thinkingAria: "Damien is thinking",
    loadingSession: "Loading the conversation…",
    inputPlaceholder: "Write your message…",
    inputAria: "Message to send",
    send: "Send the message",
    sendAria: "Send",
    reset: "Reset the conversation",
    resetDialogTitle: "Reset the conversation?",
    resetDialogDescription: "Every message exchanged will be permanently erased. This action cannot be undone.",
    resetConfirm: "Reset",
    resetCancel: "Cancel",
    streamError: "Sorry, something went wrong. Give it another try!",
    sourcesLabel: "Sources",
    copy: "Copy the message",
    copied: "Copied",
    reuse: "Send this message again",
    providerAvailable: "available",
    providerUnavailable: "unavailable",
    providerLabels: { gemini: "Gemini", groq: "Groq", mock: "Demo" },
  },
  scene: {
    bubbleLines: ["How can you tell I was born in the 90s?", "This shirt? A fully deliberate choice.", "Where have I wandered off to this time?"],
  },
  about: {
    eyebrow: "About",
    titleLead: "Product Builder & ",
    titleHighlight: "AI enthusiast",
    intro:
      "My name is Damien Pasulj. I design and build web products, with twelve years of front-end and full-stack experience, grounded in a solid JavaScript Tech Lead foundation — with, running underneath it all, an eye for aesthetics shaped at design school.",
    storyLabel: "The through line",
    story: [
      "It all started at IDEM, a design school where I studied usability, visual design and the brand identity of websites. What makes a site work — or not — from a marketing standpoint. Always passionate about interfaces and technology, I also have an aesthete's streak: I love designing things that start out inert, and bringing them to life on the web.",
      "But the surface wasn't enough. I wanted to understand the backstage — how you get from a mockup to a live site. That curiosity led me to combine a year of interface design with a year of development: a dual UI/UX and technical sensibility that still runs through everything I build.",
      "Over ten years at elloha, I grew alongside the product: from the first CMS-based tourism websites to the complete rewrite of the application core in React, TypeScript and Next.js, which I had the chance to lead. Today, at Apizee, I keep going down that road — front-end architecture, CI/CD and team mentoring.",
      "Alongside that, generative AI has become a playground and a field of exploration: LLMs, RAG, embeddings. This very site is a demonstration of it — my \"AI double\" answers on my behalf to talk about my background.",
    ],
    careerLabel: "Career",
    timeline: [
      {
        period: "2024 — present",
        role: "React / TypeScript / Next.js Lead",
        org: "Apizee",
        description: "Tech lead on the product core, defining the front-end architecture and engineering standards, setting up GitLab CI/CD pipelines and mentoring the team.",
        stack: ["React", "TypeScript", "Next.js", "GitLab CI/CD"],
        current: true,
      },
      {
        period: "2022 — 2024",
        role: "Lead on the product core rewrite",
        org: "elloha",
        description: "Drove the complete rewrite of the product in React, TypeScript and Next.js. Gradual migration away from the legacy ASP.NET/C# stack, and upskilling of the team.",
        stack: ["React", "TypeScript", "Next.js"],
      },
      {
        period: "2017 — 2022",
        role: "Front-end developer",
        org: "elloha",
        description: "Built and maintained the main web application in ASP.NET/C#. Built up deep expertise in the business domain of the tourism industry.",
        stack: ["ASP.NET", "C#"],
      },
      {
        period: "2014 — 2017",
        role: "Web developer",
        org: "elloha",
        description: "Built websites on the DotNetNuke CMS for major tourism destinations — collioure.com, tourismegard.com, morbihan.com, and many more.",
        stack: ["DotNetNuke", "Front-end web"],
      },
      {
        period: "2012 — 2014",
        role: "UI/UX & web development training",
        org: "L'IDEM — École Supérieure des Métiers Créatifs et Numériques",
        description: "A first year devoted to interface design and user experience, a second one to web development. The dual skill set that still runs through all of my work.",
      },
    ],
    currentBadge: "Current",
    skillsLabel: "Skills",
    skillGroups: [
      { label: "Core stack", items: ["React", "TypeScript", "Next.js", "Node.js"] },
      { label: "DevOps", items: ["GitLab CI/CD", "Git", "Front-end architecture"] },
      { label: "AI & RAG", items: ["LLM (Claude, OpenAI, Gemini)", "RAG", "Embeddings", "Qdrant"] },
      { label: "Design & visual identity", items: ["UI/UX", "Photoshop", "Illustrator", "InDesign", "After Effects", "Premiere Pro"] },
      { label: "Legacy", items: ["ASP.NET / C# (5+ years)", "DotNetNuke"] },
      { label: "Soft skills", items: ["Organisation", "Teamwork", "Good vibes", "Creativity"] },
    ],
    beyondCodeLabel: "Beyond the code",
    beyondCodeIntro: "Based in the Pyrénées-Orientales, I work fully remote. Native French speaker, fluent in English. Away from the screen, I feed my curiosity in other ways.",
    interests: ["Travel", "Sport", "Philosophy", "Drawing"],
    philosophyLabel: "Philosophy",
    philosophy:
      "Whatever the assignment, the goal stays the same: find the best trade-off between elegance, speed and durability. Stay lightweight, avoid piling up technical debt, pick the practices that fit the project best — and ship something you're proud of.",
    ctaQuestion: "Want to know more about my background, my projects or my passions?",
    ctaLink: "Chat with my AI double",
  },
}

export const DICTIONARIES: Record<TLocale, IDictionary> = { fr: FR, en: EN }

/** Dictionnaire d'une langue, avec repli sur {@link DEFAULT_LOCALE}. */
export function getDictionary(locale: TLocale): IDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}
