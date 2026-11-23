# Session planification

Planificateur de déroulés de séances du **CRFPE** (centre régional de formation des professionnels de l'enfance) : une application web progressive (PWA) pour construire visuellement l'agenda d'un atelier, d'une formation ou d'une réunion sur une frise chronologique.

Ce projet est un dérivé de [Sessionplan](https://github.com/tim-peters/sessionplan) (Tim Peters, licence AGPL-3.0), dont il reprend **toutes les fonctions à l'identique**, avec l'identité visuelle du **système de design CRFPE**.

## Fonctions (identiques à Sessionplan)

- Frise chronologique en glisser-déposer
- Plans sur plusieurs jours (jusqu'à 14), chacun avec sa date, son heure de début et son agenda
- Calcul automatique des horaires et des durées
- Mode direct (« live ») pour suivre le déroulé pendant la séance
- Types de blocs, bibliothèque et modèles réutilisables
- Groupes et sous-groupes parallèles (breakouts), animateurs par sous-groupe
- Partage et export : liens instantanés, liens dynamiques chiffrés de bout en bout, export/import JSON, export CSV, PDF à l'impression
- Raccourcis clavier
- Assistants IA (invite à copier, ChatGPT, Claude)
- Fonctionne hors ligne (PWA), sans inscription : les données restent dans le navigateur

## Ce qui change par rapport à Sessionplan

| Domaine | Modification |
|---|---|
| Nom | « Session planification » (interface, métadonnées, manifeste PWA) |
| Couleurs | Bleu CRFPE `#004C8E` et cyan `#41C8F4`, neutres `#2F3342` / `#EDEFF2` / `#D8D9DC`, palette d'équipes pour les types de blocs (`public/assets/ui-theme.css`) |
| Typographie | Mulish (substitut libre de Bliss Pro), police intégrée dans `public/assets/` |
| Formes | Rayons anguleux (6 px cartes, 3 px champs), pas de dégradé |
| Logo et icônes | Logotype CRFPE (favicon, icônes PWA, en-tête latéral) |
| Mode sombre | Dérivé du bleu CRFPE (la charte ne définit pas de mode sombre) |
| Exemples | Les boutons « Exemple » de la page d'accueil pointaient vers des modèles absents de l'export public ; ils ouvrent maintenant le modèle fourni |

Les identifiants techniques (clés `sp:*` du stockage local, chiffrement, API `data/sessions.php`) sont inchangés pour garantir un comportement identique.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:8080
npm test         # tests unitaires (Vitest)
npm run build    # production → dist/
```

Variables optionnelles : voir `.env.example` (`VITE_PUBLIC_BASE_URL`, `VITE_SESSIONS_API`). L'API facultative des liens dynamiques (PHP) est décrite dans [ARCHITECTURE.md](./ARCHITECTURE.md) et dans le [README amont](https://github.com/tim-peters/sessionplan#self-hosting).

## Licence

AGPL-3.0, comme le projet d'origine : voir [LICENSE](./LICENSE). Toute version modifiée mise à disposition en ligne doit en publier le code source.
