---
applyTo: "**/*.{ts,tsx,md,mdx}"
---

# Skill — Mise à jour du README

## Règle absolue

**Avant de terminer toute tâche de code, vérifie si le README doit être mis à jour.**

## Quand mettre à jour le README

Mets à jour le README dès qu'une des situations suivantes est vraie :

- Ajout d'une nouvelle fonctionnalité ou page
- Modification de la stack technique (nouvelles dépendances, outils, etc.)
- Modification des commandes (scripts npm, lancement, build, test)
- Ajout ou suppression de variables d'environnement
- Modification de l'architecture du projet (nouveaux dossiers, nouveaux patterns)
- Modification des prérequis d'installation

## Sections minimum du README

Le README doit toujours contenir :

```md
## Stack technique

## Installation

## Scripts disponibles

## Architecture

## Variables d'environnement (si applicable)
```

## Procédure

1. Lis le README actuel (`README.md`)
2. Identifie les sections impactées par la tâche réalisée
3. Mets à jour uniquement les sections concernées — ne supprime rien sans raison
4. Si une section n'existe pas encore et qu'elle est nécessaire, crée-la

## Important

Ne documente **jamais** des fonctionnalités non encore implémentées.  
Toujours écrire en **français** dans ce projet.
