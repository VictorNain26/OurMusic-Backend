import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env.js';
import { initDatabase } from './db.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { auth } from './utils/auth/auth.js';

await initDatabase();

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
  .use(auth)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen(env.PORT);

console.log(`✅ Elysia server listening on http://localhost:${env.PORT}`);
