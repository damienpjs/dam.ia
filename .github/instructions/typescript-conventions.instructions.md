---
applyTo: "**/*.{ts,tsx}"
---

# Skill — Conventions TypeScript

> **Ce skill doit être lu et appliqué AVANT d'écrire ou de modifier tout code TypeScript.**

## Conventions de nommage obligatoires

### Interfaces → préfixe `I`

Toute `interface` TypeScript doit être préfixée d'un `I` majuscule.

```ts
// ✅ Correct
interface IUser {
  id: string
  name: string
}

interface IButtonProps {
  label: string
  onClick: () => void
}

// ❌ Interdit
interface User { ... }
interface ButtonProps { ... }
```

### Types → préfixe `T`

Tout `type` TypeScript doit être préfixé d'un `T` majuscule.

```ts
// ✅ Correct
type TVariant = "default" | "outline" | "destructive"
type TSize = "sm" | "md" | "lg"
type TRibbon = {
  baseRadius: number
  colorPhase: number
}

// ❌ Interdit
type Variant = "default" | "outline"
type Size = "sm" | "md" | "lg"
```

### Exceptions autorisées

- Les **génériques** courts (`T`, `K`, `V`, `E`) restent sans préfixe
- Les types importés de librairies tierces ne sont pas renommés
- Les types React (`React.ReactNode`, `React.FC`, etc.) restent tels quels

## Checklist avant de soumettre du code

- [ ] Toutes les nouvelles `interface` sont préfixées `I`
- [ ] Tous les nouveaux `type` sont préfixés `T`
- [ ] Les types/interfaces existants modifiés respectent également la convention
- [ ] Aucun type anonyme inline là où une déclaration nommée serait plus claire

## Exemple complet

```tsx
// ✅ Fichier bien typé selon les conventions du projet
interface IMessage {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: Date
}

type TMessageRole = IMessage["role"]

type TConversation = {
  id: string
  messages: IMessage[]
  createdAt: Date
}

function MessageBubble({ message }: { message: IMessage }) {
  return <div>{message.content}</div>
}
```
