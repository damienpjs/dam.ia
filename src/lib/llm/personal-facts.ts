import { normalizeQuestion } from "@/lib/llm/repeated-question"
import { PERSONAL_FACTS, PERSONAL_FACTS_RULES, PRIVATE_TOPICS, type IPersonalFact } from "@/constants/personal-facts"

/**
 * Formate un fait en une ligne : « - Sujet : fait. Pourquoi : … Réponse personnalisée : « … » ».
 *
 * @param fact - Fait à formater
 * @returns Ligne de la fiche
 */
export function formatPersonalFact({ topic, fact, why, answer }: IPersonalFact): string {
  let line = `- ${topic} : ${fact}`
  if (why) line += `. Pourquoi : ${why}`
  if (answer) line += `. Réponse personnalisée : « ${answer} »`
  return line
}

/**
 * Construit le bloc « Fiche perso » du system prompt : faits, sujets privés et
 * règles d'usage (répondre depuis la fiche, ne rien inventer hors fiche).
 *
 * @param facts - Faits à inclure (par défaut, la fiche de Damien)
 * @param privateTopics - Sujets à décliner (par défaut, ceux de Damien)
 * @returns Bloc prêt à concaténer au persona
 */
export function buildPersonalFactsBlock(
  facts: readonly IPersonalFact[] = PERSONAL_FACTS,
  privateTopics: readonly string[] = PRIVATE_TOPICS,
): string {
  const lines = facts.map(formatPersonalFact).join("\n")
  const privacy = `- Sujets privés (${privateTopics.join(", ")}) : décline en une phrase, avec humour, sans rien confirmer ni inventer, puis ramène la conversation sur toi`
  return `Fiche perso (faits vrais sur toi, à n'utiliser que si on t'interroge dessus) :\n${lines}\n\n${PERSONAL_FACTS_RULES}\n${privacy}`
}

/**
 * Indique si une question porte sur un fait de la fiche perso (couleur, boisson,
 * film…). La réponse vient alors du system prompt : les extraits RAG, retrouvés
 * par proximité vague, n'y ont pas contribué et ne doivent pas être cités.
 * Comparaison sur mots entiers, sans accent ni casse, pour que « ide » ou « mac »
 * ne se déclenchent pas dans « idée » ou « macro ».
 *
 * @param message - Question du visiteur
 * @param facts - Faits à tester (par défaut, la fiche de Damien)
 * @returns true si au moins un mot-clé d'un fait figure dans la question
 */
export function matchesPersonalFact(message: string, facts: readonly IPersonalFact[] = PERSONAL_FACTS): boolean {
  const padded = ` ${normalizeQuestion(message)} `
  return facts.some(({ keywords }) => keywords.some((keyword) => padded.includes(` ${keyword} `)))
}
