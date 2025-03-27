import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
// import { compression } from 'elysia-compression'; // Attendre et voir quand une version compatible est dispo

import { env } from './config/env.js';
import { initDatabase } from './db/index.js';
import { betterAuthPlugin } from './config/auth.config.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

await initDatabase();

const app = new Elysia()
  .use(elysiaHelmet())
  // .use(compression())
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  .use(rateLimiter())
  .use(betterAuthPlugin)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen({
    port: env.PORT,
    hostname: '0.0.0.0',
  });

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
