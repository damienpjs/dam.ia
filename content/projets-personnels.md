---
title: "Projets personnels"
category: projets
tags: [hodl-on-a-minute, dam-ia, komfy, nextjs, rag, dynamodb, react-native, expo, websocket]
sourceUrl: "/cv-damien-pasulj.pdf"
sourceLabel: "CV (PDF)"
---

# Projets personnels

## hodl-on-a-minute — hodl-on-a-minute.vercel.app

Jeu de prédiction BTC à 60 secondes, en ligne : on parie sur la direction du cours,
la position se résout une minute plus tard.

- **Next.js / React 19** — application en ligne, déployée sur Vercel
- **DynamoDB** — persistance des paris et de leur résolution
- **Autorité serveur** — le client n'envoie qu'une direction, toute autre valeur (prix, horodatage, résultat) est produite côté serveur
- **Concurrence garantie par écritures conditionnelles** — un seul pari en cours à la fois, résolution idempotente
- **Identité par cookie signé HMAC** — pas de compte à créer
- **IAM au moindre privilège** — chaque fonction n'obtient que les droits DynamoDB dont elle a besoin

## dam.ia — damienpasulj.com

Site perso conversationnel : mon « double IA » répond sur mon parcours.

- **Next.js 16** — App Router, streaming des réponses
- **RAG avec Qdrant** — CV, LinkedIn, pages web et projets GitHub indexés en base vectorielle
- **Fallback multi-LLM en streaming** — Gemini en primaire, Groq en secours
- **95 % de couverture de tests** vérifiée en CI
- **CI GitHub Actions → Vercel** — lint, tests et déploiement automatisés

## Komfy — github.com/damienpjs/Komfy

Application mobile (~20 000 lignes de TypeScript) pilotant une instance ComfyUI.

- **React Native / Expo**
- **File d'attente temps réel en WebSocket**
- **Import et édition de workflows** ComfyUI
- **Galerie** des générations
- **Sécurité réseau Tailscale-only** — l'instance n'est jamais exposée publiquement
