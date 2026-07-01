# Proposition de branche et de commit — dam.ia

> Après chaque modification ou ajout de code, proposer (1) la création d'une nouvelle branche basée sur `develop` et (2) un message de commit — les deux au format Conventional Commits, **en anglais**.

## Règles absolues

1. **Ne jamais committer soi-même.** Aucun `git commit` n'est exécuté par l'assistant, quelles que soient les circonstances. On se contente de *proposer* le message.
2. **Ne jamais créer de branche sans accord explicite.** Aucun `git branch` / `git checkout -b` / `git switch -c` n'est exécuté tant que le développeur n'a pas répondu **oui** à la question posée.
3. Ces deux règles priment sur toute autre instruction de rapidité ou d'autonomie.

## Quand se déclencher

Dès qu'une tâche de code est terminée (ajout, modification ou suppression de fichiers source), avant de conclure la réponse.

## Étape 1 — Proposer une nouvelle branche (basée sur `develop`)

1. Vérifier la branche courante (`git branch --show-current`).
2. Proposer un nom de branche au format Conventional Commits, **en anglais** :

   ```
   <type>/<short-kebab-case-description>
   ```

   - `type` : `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `chore`, `ci`, `build`, `revert`
   - description courte, en anglais, en `kebab-case`, sans point final
   - exemples : `feat/ai-response-streaming`, `fix/logout-redirect`, `refactor/message-bubble`

3. **Demander l'accord explicite** via le tool `AskUserQuestion` (ou une question claire fermée) :

   > « Veux-tu créer la branche `feat/ai-response-streaming` à partir de `develop` ? »
   > Options : *Oui, créer la branche* / *Non, rester sur la branche actuelle*

4. **Uniquement si la réponse est un oui explicite**, exécuter :

   ```bash
   git checkout develop
   git pull --ff-only        # optionnel, pour partir d'un develop à jour
   git checkout -b <type>/<description>
   ```

   Si la réponse est non (ou toute autre réponse), ne rien créer et poursuivre sur la branche courante.

## Étape 2 — Proposer un message de commit (sans committer)

Toujours présenter la suggestion, **en anglais**, sans jamais l'exécuter :

```
<type>(<optional-scope>): <short lowercase description>

[optional body: the WHY, not the WHAT]

[optional footer: BREAKING CHANGE, closes #issue]
```

Règles de rédaction :

- description **en anglais**, à l'impératif présent (`add`, `fix`, `remove`, `update`)
- pas de majuscule en début de description, pas de point final
- 72 caractères maximum sur la première ligne
- `scope` = domaine impacté (`auth`, `ui`, `api`, `chat`, `config`, etc.)

Présentation :

> **Commit suggéré :**
> ```
> feat(chat): add streaming for AI responses
> ```

Si les changements couvrent plusieurs types distincts, suggérer plusieurs commits séparés.

## Checklist avant de conclure

- [ ] Nom de branche proposé au format `<type>/<kebab-case>` en anglais
- [ ] Accord explicite demandé avant toute création de branche
- [ ] Aucune branche créée sans un « oui » du développeur
- [ ] Message de commit proposé au format Conventional Commits en anglais
- [ ] Aucun `git commit` exécuté par l'assistant
