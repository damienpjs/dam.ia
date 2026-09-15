# Réponses au formulaire join.com — Green-Got, Product Engineer fintech B2B

## 1. Un projet que tu as shippé (produit, app, side-project, boîte)

**dam.ia** — damienpasulj.com — code : github.com/damienpjs/dam.ia

Mon site personnel, mais surtout un produit : un « double IA » qui répond aux visiteurs sur mon parcours. Environ 10 800 lignes de TypeScript, en ligne et ouvert à tous. Dedans : une pipeline RAG complète (ingestion PDF et web, chunking, embeddings, Qdrant), une orchestration multi-LLM avec fallback Gemini vers Groq qui bascule en cours de streaming quand le provider primaire renvoie un 429 ou un 503, une mémoire conversationnelle bornée « tête + queue » pour maîtriser le coût en tokens, de la détection de prompt injection et du rate limiting Redis. Couverture de tests à 95 %, seuil bloquant en CI, trois workflows GitHub Actions, previews et prod sur Vercel.

Et **Komfy** (github.com/damienpjs/Komfy), ~20 000 lignes de TypeScript : une télécommande React Native pour mon instance ComfyUI locale, que j'utilise tous les jours. On y importe un workflow ComfyUI au format API et l'app en déduit le formulaire toute seule, valide la disponibilité des nœuds et des modèles contre le serveur, et sait reconstruire un formulaire depuis les métadonnées PNG d'une image déjà générée. Auto-hébergé, accessible via Tailscale uniquement, rien d'exposé publiquement.

Côté salarié : j'ai piloté la refonte complète du SaaS elloha (plus de 10 000 professionnels du tourisme), d'ASP.NET vers React, TypeScript et Next.js, en migration progressive sans interruption de service.

## 2. Comment j'arbitre entre vitesse et qualité (3 à 5 phrases)

Je pars du coût de revenir en arrière. Si une décision est réversible en une après-midi (un composant, une page, un libellé), je shippe vite et je corrige avec le retour réel. Si elle ne l'est pas (un schéma de données, un contrat d'API, une convention que trois personnes vont copier pendant deux ans), je prends le temps, parce que c'est cette catégorie-là qui produit la dette qui coûte cher. Sur la refonte elloha, ça donnait des écrans livrés semaine après semaine, mais un socle et des conventions posés d'abord. Concrètement je préfère un périmètre plus petit et bien fini qu'un périmètre large à moitié tenu : sur dam.ia j'ai maintenu 95 % de couverture bloquante en CI, non par dogme, mais parce que seul sur un projet, c'est ce qui me permet de refactorer vite sans avoir peur.

## 3. Une friction administrative que j'ai vécue (3 à 5 phrases)

⚠️ **À COMPLÉTER PAR TOI** : je ne peux pas inventer un épisode personnel, c'est exactement le genre de détail qui se voit. Raconte-moi le tien et je le mets en forme.

Pistes concrètes si l'une te parle : une déclaration d'impôts avec des revenus annexes, la création d'un compte pro ou d'un compte séparé pour tes projets, la facturation d'une mission en direct, une démarche URSSAF ou une immatriculation abandonnée en route, un remboursement de frais, une mutuelle, un dossier de prêt. Ce qui compte pour eux, c'est le moment précis où tu as pensé « ce truc ne devrait pas être aussi compliqué », et ce que ça t'a coûté en temps.

À défaut, la réponse honnête, qui vaut mieux qu'une histoire fabriquée : « Je suis salarié depuis douze ans, je n'ai donc pas vécu la paperasse d'un indépendant de l'intérieur. Ce que je connais, c'est [ton épisode réel]. »

## 4. Comment j'utilise l'IA pour développer

Je ne l'utilise pas comme un autocomplete, je l'outille. Je travaille avec des agents de code (Claude Code) auxquels j'écris mes propres skills : des procédures versionnées dans le dépôt, qui encodent mes conventions et le contexte du projet, pour que l'agent produise du code que j'aurais écrit plutôt que du code générique. J'installe et je configure aussi des serveurs MCP tiers pour lui donner accès à mes outils (Blender, ComfyUI), et j'ai écrit moi-même, en Node/TypeScript, un serveur MCP qui exposait la pipeline RAG de dam.ia comme outil consommable par mes agents. C'était un prototype, je ne l'ai pas conservé, mais ça m'a appris à quoi ressemble une API pensée pour être consommée par un modèle plutôt que par un humain : des contrats stricts, des messages d'erreur exploitables, pas d'état implicite.

Ma règle de travail est écrite dans le README de Komfy : ne jamais coder sur des suppositions. Les types TypeScript y sont dérivés des réponses réelles de l'API, pas devinées. Avec un agent, cette discipline est ce qui fait la différence entre aller trois fois plus vite et produire trois fois plus de dette. Je relis tout, et je teste : c'est le seuil de couverture qui me permet de laisser un agent refactorer sans stresser.

## 5. Lien LinkedIn / portfolio

- damienpasulj.com (le site est lui-même la démo)
- github.com/damienpjs
- LinkedIn : ⚠️ à ajouter par toi
