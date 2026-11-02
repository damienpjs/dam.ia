/**
 * Âge révolu à une date donnée : l'année en cours compte seulement une fois
 * l'anniversaire passé (le 26 janvier 2027, quelqu'un né le 27 janvier 1992 a
 * encore 34 ans).
 *
 * @param birthDate - Date de naissance
 * @param today - Date de référence (par défaut, maintenant)
 * @returns Âge en années pleines
 */
export function ageOn(birthDate: Date, today: Date = new Date()): number {
  const age = today.getFullYear() - birthDate.getFullYear()
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())
  return birthdayPassed ? age : age - 1
}
