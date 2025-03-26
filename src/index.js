import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env.js';
import { initDatabase } from './db.js';
import betterAuthView from './utils/auth-view.js';

import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

await initDatabase();

const app = new Elysia()
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  // 🔐 Better Auth handler monté comme view personnalisée
  .all('/api/auth/*', betterAuthView)

  // 📦 Vos routes métier
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 🧯 Gestion globale des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  .listen(env.PORT);

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
