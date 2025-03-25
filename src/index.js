import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import BetterAuth from 'better-auth';
import { env } from './config/env.js';
import { initDatabase, db } from './db.js';
import { user, session, account, verification } from './db/schema.js';

import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

await initDatabase();

// ➕ Init Better Auth directement ici
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
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['Set-Cookie'],
    })
  )

  // ➕ Brancher Better Auth (handler + macro d'authentification)
  .use(auth.handler)
  .use(
    auth.macro({
      auth: {
        async resolve({ request, error }) {
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session) return error(401, 'Non authentifié');
          return session.user;
        },
      },
    })
  )

  // ✅ Tes routes métier
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 🛑 Gestion globale des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // ✅ Lancement serveur
  .listen(env.PORT);

console.log(`✅ Elysia server listening on http://localhost:${env.PORT}`);
