# OurMusic Backend

OurMusic Backend est une API écrite avec [Elysia](https://elysiajs.com/) et fonctionnant sous [Bun](https://bun.sh/). Elle expose plusieurs routes permettant de lier l'application OurMusic à Spotify et de gérer les morceaux likés par les utilisateurs.

## Fonctionnalités

- Authentification via [BetterAuth](https://www.npmjs.com/package/better-auth)
- Gestion des "likes" sur des morceaux (ajout, suppression, liste)
- Synchronisation avec des playlists Spotify
- Scraping de titres depuis HypeMachine
- Jobs CRON optionnels pour synchroniser automatiquement les playlists et lancer des sessions de scraping
- Flux SSE pour suivre l'avancement des tâches longue durée

## Pré‑requis

- [Bun](https://bun.sh/) installé localement
- Une base de données PostgreSQL accessible
- Un compte Spotify développeur pour récupérer les identifiants API

## Installation

```bash
bun install
```

Copiez le fichier `.env.exemple` vers `.env` puis complétez toutes les variables d'environnement nécessaires :

```bash
cp .env.exemple .env
```

Les variables importantes sont :

- `DATABASE_URL` – URL de connexion PostgreSQL
- `BETTER_AUTH_URL` et `BETTER_AUTH_SECRET` – configuration de BetterAuth
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_USER_ID`, `SPOTIFY_REFRESH_TOKEN`
- `PLAYLIST_PATH` et `COOKIE_FILE` pour `spotdl`
- Paramètres SMTP pour l'envoi d'e‑mails
- `ENABLE_CRON` pour activer les tâches planifiées

## Lancement en développement

```bash
bun run db:push   # exécute les migrations
bun run start
```

Un endpoint de santé est disponible sur [http://localhost:3000/health](http://localhost:3000/health).

## Utilisation avec Docker

Une image Docker est fournie :

```bash
docker build -t ourmusic-backend .
docker run --env-file .env -p 3000:3000 ourmusic-backend
```

Les migrations sont lancées automatiquement via `entrypoint.sh` au démarrage du conteneur.

## Scripts utiles

- `bun run seed:admin` – crée un compte administrateur
- `bun run reset:all` – réinitialise complètement la base et les fichiers spotDL
- `bun run lint` – lance ESLint sur tout le projet

## Déploiement

Un workflow GitHub Actions (`.github/workflows/deploy.yml`) déploie automatiquement la branche `master` sur le serveur VPS configuré.

---

Ce projet n'inclut pas de licence spécifique.
