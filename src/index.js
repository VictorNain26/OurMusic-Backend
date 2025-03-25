import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import BetterAuth from 'better-auth';
import { env } from './config/env.js';
import { initDatabase, db } from './db.js';
import { user, session, account, verification } from './db/schema.js';

import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

// ⏳ Initialisation de la base de données avant de lancer l’app
await initDatabase();

// 1. Création de l’instance BetterAuth
//    - On lui passe la connexion, le schéma et la clé secrète
const auth = new BetterAuth({
  secret: env.BETTER_AUTH_SECRET,
  db,
  schema: {
    user,
    session,
    account,
    verification,
  },
});

const app = new Elysia()
  // 2. Configuration du CORS (si votre API est appelée depuis un front web)
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['Set-Cookie'],
    })
  )

  // 3. Brancher le "handler" de Better Auth.
  //    - Cela enregistre les routes d’authentification (login, logout, etc.)
  .use(auth.handler)

  // 4. Définir un "macro" pour la résolution de l’utilisateur.
  //    - Ce macro vous permet d’utiliser `ctx.auth` pour récupérer l’utilisateur.
  //    - Si la session n’est pas valide, on retourne un 401 (Non authentifié).
  .use(
    auth.macro({
      auth: {
        async resolve({ request, error }) {
          // Vérifie la session en lisant les en-têtes
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session) return error(401, 'Non authentifié');
          return session.user;
        },
      },
    })
  )

  // 5. Vos routes métier
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 6. Gestion globale des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // 7. Lancement du serveur
  .listen(env.PORT);

console.log(`✅ Elysia server listening on http://localhost:${env.PORT}`);
