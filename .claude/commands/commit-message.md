# Suggestion de message de commit — dam.ia

> Après chaque modification ou ajout de code, proposer un message de commit au format Conventional Commits.

## Règle absolue

**Après toute modification ou ajout de code, toujours suggérer un message de commit.**

## Format Conventional Commits

```
<type>(<scope optionnel>): <description courte en minuscules>

[corps optionnel : explication du POURQUOI, pas du QUOI]

[footer optionnel : BREAKING CHANGE, closes #issue]
```

## Types autorisés

| Type | Quand l'utiliser |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Réécriture sans changement de comportement |
| `test` | Ajout ou modification de tests uniquement |
| `docs` | Modification de documentation (README, commentaires) |
| `style` | Formatage, espaces, lint — pas de logique |
| `perf` | Amélioration de performance |
| `chore` | Maintenance, mise à jour de dépendances, config |
| `ci` | Modification des workflows CI/CD |
| `build` | Modification du système de build |
| `revert` | Annulation d'un commit précédent |

## Règles de rédaction

- Description en **français**, à l'infinitif (`ajouter`, `corriger`, `supprimer`)
- Pas de majuscule en début de description
- Pas de point final
- 72 caractères maximum sur la première ligne
- Le scope correspond au domaine impacté (`auth`, `ui`, `api`, `chat`, `config`, etc.)

## Exemples

```
feat(chat): ajouter le streaming des réponses IA

fix(auth): corriger la redirection après déconnexion

refactor(ui): extraire le composant MessageBubble

test(lib): ajouter les tests pour le parser de markdown

docs: mettre à jour la section Architecture du README

chore(deps): mettre à jour next vers 15.2.0
```

## Procédure

À la fin de chaque tâche de code :

1. Analyser les fichiers modifiés/ajoutés
2. Identifier le type et le scope appropriés
3. Rédiger une description concise à l'infinitif
4. Présenter la suggestion ainsi :

> **Commit suggéré :**
> ```
> feat(scope): description
> ```

Si les changements couvrent plusieurs types distincts, suggérer plusieurs commits séparés.
