import { DEFAULT_LOCALE, type TLocale } from "@/constants/i18n"

/**
 * Dictionnaires de traduction du contenu affiché (FR / EN).
 *
 * Tout texte visible par le visiteur vit ici, jamais en dur dans un composant,
 * afin qu'ajouter une langue se résume à ajouter une entrée dans
 * {@link DICTIONARIES}. Les noms propres (technos, entreprises, écoles) ne sont
 * pas traduits.
 *
 * L'interface reprend la métaphore du CV : chaque bloc est un fichier (nom,
 * taille en octets), chaque section un dossier (nom, nombre d'éléments). Les
 * noms de fichiers et de dossiers se traduisent avec le reste.
 */

/** Une expérience, présentée comme un fichier `.md` de la page « à propos ». */
export interface IExperienceFile {
  file: string
  role: string
  org: string
  period: string
  /** Points clés en liste, ou à défaut un paragraphe dans `text`. */
  bullets?: string[]
  text?: string
}

/** Un projet personnel : le nom de fichier est son adresse publique. */
export interface IProjectFile {
  /** Adresse affichée en en-tête, sans protocole. */
  file: string
  href: string
  name: string
  tags: string
  text: string
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
    /** Libellé accessible de la barre de navigation partagée. */
    navLabel: string
    /** Lien de navigation vers la page « à propos ». */
    navAbout: string
    /** Lien de navigation vers la conversation, depuis « à propos ». */
    navChat: string
    /** Retour à l'accueil, depuis « à propos ». */
    navHome: string
    /** Taille d'un fichier, entre parenthèses : « (431 o) », « (300 Ko) ». */
    fileSize: (bytes: number) => string
    /** Contenu d'un dossier, entre parenthèses : « (3 éléments) ». */
    itemCount: (count: number) => string
  }
  landing: {
    /** Intitulé de poste, sous le nom. */
    role: string
    startConversation: string
    startConversationAria: string
    /** Aide discrète sur la manipulation de la scène 3D (desktop). */
    orbitHint: string
  }
  chat: {
    /** Message d'accueil (README.md), jamais persisté : il suit la langue courante. */
    welcome: string
    /** Nom du fichier d'accueil. */
    welcomeFile: string
    /** Dossier qui regroupe la conversation, dans l'en-tête du panneau. */
    conversationDir: string
    /** Nombre de messages échangés, à côté du dossier de conversation. */
    messageCount: (count: number) => string
    suggestionsDir: string
    suggestions: Record<TSuggestionId, string>
    /** Phrases de « réflexion » tapées lettre par lettre en attendant la réponse. */
    thinkingPhrases: string[]
    thinkingAria: string
    loadingSession: string
    inputPlaceholder: string
    inputAria: string
    /** Libellé visible du bouton d'envoi. */
    send: string
    sendAria: string
    /** Libellé visible du bouton de réinitialisation. */
    resetLabel: string
    reset: string
    resetDialogTitle: string
    resetDialogDescription: string
    resetConfirm: string
    resetCancel: string
    streamError: string
    /** Remplace l'heure dans l'en-tête d'une réponse en erreur. */
    errorLabel: string
    sourcesDir: string
    copyLabel: string
    copiedLabel: string
    copy: string
    copied: string
    reuseLabel: string
    reuse: string
  }
  scene: {
    /** Répliques de la bulle au-dessus du personnage 3D. */
    bubbleLines: string[]
  }
  about: {
    readme: string
    storyFile: string
    story: string[]
    photoAlt: string
    /** Indique que la photo défile dans son cadre. */
    photoScrollHint: string
    contactLocation: string
    contactLanguages: string
    experienceDir: string
    experience: IExperienceFile[]
    projectsDir: string
    projects: IProjectFile[]
    philosophyFile: string
    philosophy: string
    todoDone: string[]
    todoOpen: string
    educationFile: string
    education: string
    offscreenDir: string
    offscreen: string[]
    ctaQuestion: string
    ctaLink: string
    updatedLabel: string
  }
}

/** « 431 o » sous 1 Ko, « 300 Ko » au-delà (unité selon la langue). */
function formatFileSize(bytes: number, byteUnit: string, kiloUnit: string): string {
  return bytes < 1024 ? `(${bytes} ${byteUnit})` : `(${Math.round(bytes / 1024)} ${kiloUnit})`
}

const FR: IDictionary = {
  common: {
    languageLabel: "Langue",
    localeNames: { fr: "Français", en: "Anglais" },
    navLabel: "Navigation",
    navAbout: "à-propos/",
    navChat: "conversation/",
    navHome: "← accueil",
    fileSize: (bytes) => formatFileSize(bytes, "o", "Ko"),
    itemCount: (count) => `(${count} élément${count > 1 ? "s" : ""})`,
  },
  landing: {
    role: "Lead Tech JavaScript · IA appliquée",
    startConversation: "démarrer la conversation",
    startConversationAria: "Commencer la conversation",
    orbitHint: "clic-glissé : tourner · molette : zoom",
  },
  chat: {
    welcome: "Ici, c’est mon double IA qui te répond. Demande-lui mon parcours, de la refonte d’elloha à mon poste de lead tech chez Apizee, mes projets, ou ce que je fais loin de l’écran.",
    welcomeFile: "README.md",
    conversationDir: "conversation/",
    messageCount: (count) => `(${count} message${count > 1 ? "s" : ""})`,
    suggestionsDir: "suggestions/",
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
      "Damien relit ses notes",
    ],
    thinkingAria: "Damien réfléchit",
    loadingSession: "Chargement de la conversation…",
    inputPlaceholder: "Écris ton message…",
    inputAria: "Message à envoyer",
    send: "envoyer ↲",
    sendAria: "Envoyer",
    resetLabel: "effacer",
    reset: "Effacer la conversation",
    resetDialogTitle: "Réinitialiser la conversation ?",
    resetDialogDescription: "Tous les messages échangés seront définitivement effacés. Cette action est irréversible.",
    resetConfirm: "Réinitialiser",
    resetCancel: "Annuler",
    streamError: "Désolé, une erreur est survenue. Réessaie !",
    errorLabel: "erreur",
    sourcesDir: "sources/",
    copyLabel: "copier",
    copiedLabel: "copié ✓",
    copy: "Copier le message",
    copied: "Copié",
    reuseLabel: "↻ renvoyer",
    reuse: "Renvoyer ce message",
  },
  scene: {
    bubbleLines: ["Comment tu sais que je suis né dans les 90's ?", "Cette chemise ? Un choix tout à fait assumé.", "Où est-ce que je me suis encore perdu ?"],
  },
  about: {
    readme:
      "J’ai passé dix ans chez elloha, jusqu’à y mener la réécriture du produit vers React et Next.js, le tout sans coupure. Depuis 2024, chez Apizee, je suis lead technique JavaScript sur le cœur de produit. En parallèle, je contribue à la transition vers l’IA dans l’équipe : skills et guardrails dans la stack, et un workflow agentique qui prend en charge le traitement des tickets, de Jira jusqu’à la merge request.",
    storyFile: "fil-rouge.md",
    story: [
      "Tout a commencé à l’IDEM, une école de design où j’étudiais l’ergonomie, l’apparence et l’identité visuelle des sites. Ce qui fait qu’un site fonctionne (ou pas) d’un point de vue marketing. Passionné d’interfaces et de technologies depuis toujours, j’ai aussi un côté esthète : j’aime concevoir des choses, initialement inertes, et leur donner vie sur le web.",
      "Mais la surface ne suffisait pas. Je voulais comprendre l’envers du décor : comment on passe d’une maquette à un site en ligne. Cette curiosité m’a conduit à mêler une année de design d’interface à une année de développement : une double sensibilité UI/UX et technique qui irrigue encore tout mon travail.",
    ],
    photoAlt: "Damien Pasulj en voyage, devant un temple",
    photoScrollHint: "↕ défiler",
    contactLocation: "Pyrénées-Orientales, full remote",
    contactLanguages: "FR natif, EN courant",
    experienceDir: "expérience/",
    experience: [
      {
        file: "apizee.md",
        role: "Tech Lead React / TypeScript / Next.js",
        org: "Apizee",
        period: "2024–aujourd’hui",
        bullets: [
          "Pipeline agentique GitLab CI/Jira : un agent de code trie, implémente puis challenge les tickets.",
          "Architecture front-end, conventions, revue de code, pipelines GitLab CI/CD.",
          "Équipe de 3 développeurs, montée en compétences par le pairing et des standards écrits.",
        ],
      },
      {
        file: "elloha_lead-refonte.md",
        role: "Lead de la refonte du produit",
        org: "elloha",
        period: "2022–2024",
        bullets: [
          "Refonte complète du SaaS de réservation touristique (plus de 10 000 professionnels) d’ASP.NET/C# vers React, TypeScript et Next.js, migré progressivement, sans coupure.",
          "Architecture, conventions et outillage définis pour l’équipe. 3 développeurs encadrés en continu, une dizaine formés sur la période.",
        ],
      },
      {
        file: "elloha_web-front.md",
        role: "Développeur web puis front-end",
        org: "elloha",
        period: "2014–2022",
        text: "Application principale en ASP.NET/C#, et avant cela des sites de destinations sous DotNetNuke (collioure.com, morbihan.com).",
      },
    ],
    projectsDir: "projets/",
    projects: [
      {
        file: "damienpasulj.com",
        href: "https://damienpasulj.com",
        name: "dam.ia",
        tags: "IA, RAG, multi-LLM",
        text: "En ligne : un double IA répond sur mon parcours. RAG sur Qdrant, bascule de Gemini vers Groq en plein streaming, détection de prompt injection, rate limiting. 10 800 lignes de TypeScript, 95 % de couverture exigée en CI.",
      },
      {
        file: "hodl-on-a-minute.vercel.app",
        href: "https://hodl-on-a-minute.vercel.app",
        name: "hodl-on-a-minute",
        tags: "jeu en ligne",
        text: "Prédiction du bitcoin à 60 secondes, en ligne. Le client n’envoie qu’une direction ; un seul pari à la fois, garanti par des écritures conditionnelles DynamoDB testées contre une vraie base en Docker.",
      },
      {
        file: "github.com/damienpjs/Komfy",
        href: "https://github.com/damienpjs/Komfy",
        name: "Komfy",
        tags: "IA générative, mobile",
        text: "Télécommande mobile de mon instance ComfyUI, utilisée au quotidien (React Native, Expo, 20 000 lignes de TypeScript). Chaque workflow importé génère son formulaire.",
      },
    ],
    philosophyFile: "philosophie.txt",
    philosophy:
      "Quelle que soit la mission, l’objectif reste le même : trouver le meilleur compromis entre élégance, rapidité et durabilité. Rester léger, ne pas accumuler de dette technique, choisir les pratiques les mieux adaptées au projet, et livrer quelque chose dont on est fier.",
    todoDone: ["réécrire un legacy en React, sans coupure", "former une équipe front", "mettre un double IA en ligne", "orchestrer des agents dans le flux de l’équipe"],
    todoOpen: "arrêter de poster chaque run sur Strava",
    educationFile: "formation.txt",
    education: "2012–2014, L’IDEM, métiers créatifs et numériques : design UI/UX, puis développement web.",
    offscreenDir: "hors-ecran/",
    offscreen: ["callisthenie.txt", "course-a-pied.txt", "bricolage.txt", "philosophie.txt"],
    ctaQuestion: "Envie d’en savoir plus sur mon parcours, mes projets ou mes passions ?",
    ctaLink: "discute avec mon double IA",
    updatedLabel: "dernière mise à jour",
  },
}

const EN: IDictionary = {
  common: {
    languageLabel: "Language",
    localeNames: { fr: "French", en: "English" },
    navLabel: "Navigation",
    navAbout: "about/",
    navChat: "chat/",
    navHome: "← home",
    fileSize: (bytes) => formatFileSize(bytes, "B", "KB"),
    itemCount: (count) => `(${count} item${count > 1 ? "s" : ""})`,
  },
  landing: {
    role: "JavaScript Tech Lead · Applied AI",
    startConversation: "start the conversation",
    startConversationAria: "Start the conversation",
    orbitHint: "drag: orbit · scroll: zoom",
  },
  chat: {
    welcome: "This is my AI double talking. Ask it about my background, from rebuilding elloha to leading JavaScript at Apizee, my side projects, or what I do away from the screen.",
    welcomeFile: "README.md",
    conversationDir: "chat/",
    messageCount: (count) => `(${count} message${count > 1 ? "s" : ""})`,
    suggestionsDir: "suggestions/",
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
      "Damien is rereading his notes",
    ],
    thinkingAria: "Damien is thinking",
    loadingSession: "Loading the conversation…",
    inputPlaceholder: "Write your message…",
    inputAria: "Message to send",
    send: "send ↲",
    sendAria: "Send",
    resetLabel: "clear",
    reset: "Clear the conversation",
    resetDialogTitle: "Reset the conversation?",
    resetDialogDescription: "Every message exchanged will be permanently erased. This action cannot be undone.",
    resetConfirm: "Reset",
    resetCancel: "Cancel",
    streamError: "Sorry, something went wrong. Give it another try!",
    errorLabel: "error",
    sourcesDir: "sources/",
    copyLabel: "copy",
    copiedLabel: "copied ✓",
    copy: "Copy the message",
    copied: "Copied",
    reuseLabel: "↻ resend",
    reuse: "Resend this message",
  },
  scene: {
    bubbleLines: ["How can you tell I was born in the 90s?", "This shirt? A fully deliberate choice.", "Where have I wandered off to this time?"],
  },
  about: {
    readme:
      "I spent ten years at elloha, up to leading the product’s rewrite to React and Next.js, all with zero downtime. Since 2024 at Apizee, I have been the JavaScript tech lead on the core product. Alongside that, I contribute to the team’s transition to AI: skills and guardrails in the stack, and an agentic workflow that handles ticket processing, from Jira all the way to the merge request.",
    storyFile: "through-line.md",
    story: [
      "It all started at IDEM, a design school where I studied usability, visual design and the brand identity of websites. What makes a site work (or not) from a marketing standpoint. Always passionate about interfaces and technology, I also have an aesthete’s streak: I love designing things that start out inert, and bringing them to life on the web.",
      "But the surface wasn’t enough. I wanted to understand the backstage: how you get from a mockup to a live site. That curiosity led me to combine a year of interface design with a year of development: a dual UI/UX and technical sensibility that still runs through everything I build.",
    ],
    photoAlt: "Damien Pasulj travelling, in front of a temple",
    photoScrollHint: "↕ scroll",
    contactLocation: "South of France, fully remote",
    contactLanguages: "French (native), English (fluent)",
    experienceDir: "experience/",
    experience: [
      {
        file: "apizee.md",
        role: "React / TypeScript / Next.js Tech Lead",
        org: "Apizee",
        period: "2024–present",
        bullets: [
          "Agentic GitLab CI/Jira pipeline: a coding agent triages, implements, then challenges tickets.",
          "Front-end architecture, conventions, code review, GitLab CI/CD pipelines.",
          "Team of 3 developers, grown through pairing and written standards.",
        ],
      },
      {
        file: "elloha_lead-rewrite.md",
        role: "Core product rewrite lead",
        org: "elloha",
        period: "2022–2024",
        bullets: [
          "Complete rewrite of the travel booking SaaS (10,000+ tourism professionals) from ASP.NET/C# to React, TypeScript and Next.js, migrated incrementally with zero downtime.",
          "Defined the architecture, conventions and tooling. Led 3 developers at any given time, onboarded around ten over the period.",
        ],
      },
      {
        file: "elloha_web-front.md",
        role: "Web then front-end developer",
        org: "elloha",
        period: "2014–2022",
        text: "Main application in ASP.NET/C#; before that, destination websites on DotNetNuke (collioure.com, morbihan.com).",
      },
    ],
    projectsDir: "projects/",
    projects: [
      {
        file: "damienpasulj.com",
        href: "https://damienpasulj.com",
        name: "dam.ia",
        tags: "AI, RAG, multi-LLM",
        text: "Live: an AI double answers questions about my career. RAG on Qdrant, mid-stream failover from Gemini to Groq, prompt injection detection, rate limiting. 10,800 lines of TypeScript, 95% coverage enforced in CI.",
      },
      {
        file: "hodl-on-a-minute.vercel.app",
        href: "https://hodl-on-a-minute.vercel.app",
        name: "hodl-on-a-minute",
        tags: "web game",
        text: "Live 60-second bitcoin prediction game. The client only sends a direction; one bet at a time, enforced by DynamoDB conditional writes tested against a real database in Docker.",
      },
      {
        file: "github.com/damienpjs/Komfy",
        href: "https://github.com/damienpjs/Komfy",
        name: "Komfy",
        tags: "generative AI, mobile",
        text: "Mobile remote for my own ComfyUI instance, used daily (React Native, Expo, 20,000 lines of TypeScript). Each imported workflow generates its own form.",
      },
    ],
    philosophyFile: "philosophy.txt",
    philosophy:
      "Whatever the assignment, the goal stays the same: find the best trade-off between elegance, speed and durability. Stay lightweight, avoid piling up technical debt, pick the practices that fit the project best, and ship something you’re proud of.",
    todoDone: ["move legacy to React, zero downtime", "train a front-end team", "ship an AI double", "orchestrate agents in the team’s workflow"],
    todoOpen: "stop posting every run on Strava",
    educationFile: "education.txt",
    education: "2012–2014, L’IDEM, France: UI/UX design, then web development.",
    offscreenDir: "off-screen/",
    offscreen: ["calisthenics.txt", "running.txt", "diy.txt", "philosophy.txt"],
    ctaQuestion: "Want to know more about my background, my projects or my passions?",
    ctaLink: "chat with my AI double",
    updatedLabel: "last updated",
  },
}

export const DICTIONARIES: Record<TLocale, IDictionary> = { fr: FR, en: EN }

/** Dictionnaire d'une langue, avec repli sur {@link DEFAULT_LOCALE}. */
export function getDictionary(locale: TLocale): IDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}
