# Conventions TypeScript — dam.ia

> Appliqué automatiquement sur tout fichier `*.ts` / `*.tsx`.

## Nommage obligatoire

### Interfaces → préfixe `I`

```ts
// ✅ Correct
interface IUser { id: string; name: string }
interface IButtonProps { label: string; onClick: () => void }

// ❌ Interdit
interface User { ... }
interface ButtonProps { ... }
```

### Types → préfixe `T`

```ts
// ✅ Correct
type TVariant = "default" | "outline" | "destructive"
type TSize = "sm" | "md" | "lg"

// ❌ Interdit
type Variant = "default" | "outline"
type Size = "sm" | "md" | "lg"
```

### Exceptions autorisées

- Génériques courts (`T`, `K`, `V`, `E`) — pas de préfixe
- Types importés de librairies tierces — pas renommés
- Types React (`React.ReactNode`, `React.FC`, etc.) — pas renommés

## Tests unitaires obligatoires

**Tout ajout ou modification de code doit être accompagné des tests correspondants.**

| Fichier source | Fichier de test miroir |
|---|---|
| `src/components/ui/button.tsx` | `src/tests/components/ui/button.test.tsx` |
| `src/lib/utils.ts` | `src/tests/lib/utils.test.ts` |
| `src/app/page.tsx` | `src/tests/app/page.test.tsx` |

- **Nouveau fichier** → créer le test miroir dans `src/tests/` (même arborescence)
- **Modification** → mettre à jour les tests existants, en ajouter si nécessaire
- **Suppression** → supprimer les tests associés

## Couverture minimale : 95 %

Vérifier avec `npm run coverage` avant de pousser. Le CI (`npm run test:ci`) bloque si le seuil n'est pas atteint.

## Détection du code mort

Après chaque modification, identifier les fichiers/composants/fonctions qui ne sont plus importés ou référencés. Signaler explicitement au développeur :

> "Les fichiers suivants semblent inutilisés suite à cette modification : X, Y. Souhaites-tu les supprimer ?"

Si confirmation positive → supprimer aussi les fichiers de test miroirs associés.

## Checklist avant de soumettre

- [ ] Nouvelles `interface` préfixées `I`
- [ ] Nouveaux `type` préfixés `T`
- [ ] Types/interfaces existants modifiés respectent la convention
- [ ] Pas de type anonyme inline là où une déclaration nommée serait plus claire
- [ ] Fichier de test créé ou mis à jour pour chaque fichier modifié
- [ ] `npm run coverage` passe sans erreur (≥ 95 %)
