# linv.dev

Le hub des projets de Linventif : applications, outils open source, Garry’s Mod
et expérimentations. Les liens et descriptions sont issus du portfolio public
et des dépôts publics GitHub. L’ancien site et son historique sont archivés dans
[linventif/linv.dev.old](https://github.com/linventif/linv.dev.old).

Seuls les sites de projets vérifiés accessibles sont affichés. Chaque carte mène
directement au site. Les dépôts GitHub et fiches Steam Workshop ne sont pas des
destinations, et un site indisponible ne produit aucune carte.

## Développement

Node.js 24 et npm sont recommandés.

```sh
npm ci
npm run dev
```

Le serveur Astro est disponible sur <http://localhost:4321> avec rechargement
automatique. Le site comprend une recherche, des filtres partageables dans l’URL,
un thème clair/sombre et une navigation au clavier. `/` ou `Ctrl/Cmd + K` place
le curseur dans la recherche ; `Échap` réinitialise les filtres depuis ce champ.

## Nginx sur le port 8099

```sh
docker compose up -d --build
```

Ouvrir <http://localhost:8099>. L’image Docker construit Astro puis ne copie que
les fichiers de `dist/` dans Nginx. Relancer cette commande après modification
du site. Les sources et le dossier `.git` ne sont pas servis.

```sh
docker compose logs --tail=50 nginx
docker compose exec -T nginx nginx -t
docker compose down
```

## Cloudflare Pages

Le dépôt `linventif/linv.dev` doit contenir le hub Astro, notamment `package.json`
et `package-lock.json`, sur la branche `main` utilisée par Cloudflare.

- Répertoire racine : racine du dépôt.
- Commande de compilation : `npm run build`.
- Répertoire de sortie : `dist`.
- Version Node.js : `24.20.0`, définie dans `.node-version`.

Cloudflare installe automatiquement les dépendances avant la compilation. Le site
est statique : aucun adaptateur Cloudflare ni fichier Wrangler n’est nécessaire.
Un déploiement qui récupère encore le commit `1a1ede5` utilise l’ancien portfolio,
qui ne possède pas de `package.json` ; il faut déployer la nouvelle version de `main`.

## Catalogue et vérification des liens

- `src/data/projects.json` : sites candidats, descriptions, catégories et sources.
- `src/data/availability.json` : dernier instantané DNS/HTTPS.
- `scripts/scan-projects.ts` : vérification explicite des seules destinations du catalogue.

```sh
npm run scan
node scripts/scan-projects.ts --check
npm run check
npm test
npm run build
```

Le scan utilise uniquement des requêtes DNS et HTTPS publiques, sans identifiants.
Il distingue un site accessible, bloqué, indisponible ou en erreur. Seul l’état
accessible permet l’affichage d’une carte. Les domaines de
monitoring personnel et les consoles d’administration sont exclus du catalogue.
Le scan est un instantané daté, pas une surveillance en temps réel ; il ne se
déclenche pas à chaque visite ou compilation. Après un scan, reconstruire le site.
Pour ajouter un projet, renseigner sa fiche et ses sources, relancer le scan,
puis reconstruire.

## Stack

Astro 7, TypeScript 7, Tailwind CSS 4 via le plugin Vite et DaisyUI 5 avec deux
thèmes personnalisés. Le HTML est précompilé et seul le filtrage utilise du
JavaScript côté navigateur. Les polices sont hébergées localement.

La commande `tsc` utilise TypeScript 7 stable (`@typescript/native`).
`astro check` utilise l’API compatible TypeScript 6 sous l’alias `typescript`,
selon la [configuration officielle de coexistence](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

Les routes historiques `/creations`, `/docs`, `/colors`, `/social` et `/terms`
redirigent vers la liste des projets.
