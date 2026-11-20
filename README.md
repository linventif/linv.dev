# linv.dev

Le hub des projets de Linventif : applications, outils open source, Garry’s Mod
et expérimentations. Les liens et descriptions sont issus du portfolio public
et des dépôts publics GitHub. L’ancien site et son historique sont archivés dans
[linventif/linv.dev.old](https://github.com/linventif/linv.dev.old).

Seuls les sites de projets vérifiés accessibles sont affichés. Chaque carte mène
directement au site. Les dépôts GitHub et fiches Steam Workshop ne sont pas des
destinations, et un site indisponible ne produit aucune carte.

La section **Raccourcis** reprend les liens publics documentés dans
[l’ancienne configuration Nginx](https://github.com/linventif/prod-nginx-config/blob/main/linv.conf).
Les profils et sous-domaines sont affichés uniquement après une vérification
HTTPS réussie. Les services personnels et consoles d’administration sont exclus.

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

L’adresse publique utilisée pour les liens canoniques et les aperçus de partage
est `https://linv-dev.pages.dev`. Après activation du domaine personnalisé,
définir `SITE_URL=https://linv.dev` dans l’environnement de compilation Cloudflare
et redéployer. L’image de partage PNG (`public/social.png`, 1200 × 630) est servie
sur cette même adresse et référencée dans les métadonnées Open Graph et Twitter.

Cloudflare installe automatiquement les dépendances avant la compilation. Le site
est statique : aucun adaptateur Cloudflare ni fichier Wrangler n’est nécessaire.
Un déploiement qui récupère encore le commit `1a1ede5` utilise l’ancien portfolio,
qui ne possède pas de `package.json` ; il faut déployer la nouvelle version de `main`.

## Catalogue et vérification des liens

- `src/data/projects.json` : sites candidats, descriptions, catégories et sources.
- `src/data/availability.json` : dernier instantané DNS/HTTPS.
- `src/data/shortcuts.json` : liens courts publics et leurs destinations.
- `src/data/subdomains.json` : sous-domaines publics et anciens alias documentés.
- `src/data/shortcut-availability.json` et `subdomain-availability.json` : état de ces liens.
- `scripts/scan-projects.ts` : vérification explicite des seules destinations du catalogue.
- `scripts/generate-redirects.ts` : génération des règles Cloudflare Pages et Nginx.

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

## Raccourcis et redirections

`npm run build` génère les mêmes raccourcis, avec ou sans slash final, dans
`public/_redirects` pour Cloudflare Pages et dans `nginx-shortcuts.conf` pour
Nginx. Les anciennes routes `/creations`, `/docs`, `/colors`, `/social` et `/terms`
restent dirigées vers la liste des sites.

Les deux anciens alias `gmi.linv.dev` et `discord.linv.dev` sont préparés dans
`nginx-subdomains.conf` et `cloudflare/subdomain-redirects.csv` :

- `gmi.linv.dev` mène à `gmod-integration.com`, en conservant le chemin et la requête.
- `discord.linv.dev` mène à l’invitation Discord publique validée.

Le CSV est prêt à être importé dans une liste de redirections en masse Cloudflare,
puis à activer via une règle. Ces alias doivent aussi disposer d’enregistrements
DNS proxifiés. Les fichiers du dépôt ne créent pas les enregistrements DNS ni les
règles de compte. Tant qu’un alias ne répond pas, il n’est pas affiché sur le hub.

Une redirection générale de zone vers le portfolio doit être retirée ou limitée
pour laisser le hub et ses raccourcis répondre : les règles de zone sont exécutées
avant les règles du site Pages.

## Stack

Astro 7, TypeScript 7, Tailwind CSS 4 via le plugin Vite et DaisyUI 5 avec deux
thèmes personnalisés. Le HTML est précompilé et seul le filtrage utilise du
JavaScript côté navigateur. Les polices sont hébergées localement.

La commande `tsc` utilise TypeScript 7 stable (`@typescript/native`).
`astro check` utilise l’API compatible TypeScript 6 sous l’alias `typescript`,
selon la [configuration officielle de coexistence](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

Les routes historiques `/creations`, `/docs`, `/colors`, `/social` et `/terms`
redirigent vers la liste des projets.
