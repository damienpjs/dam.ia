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
