import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { compression } from 'elysia-compression';
import { elysiaRequestId } from 'elysia-request-id';
import { logysia } from 'logysia';

import { env } from './config/env.js';
import { initDatabase } from './db.js';
import { betterAuthPlugin } from './config/auth.config.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

await initDatabase();

const app = new Elysia()
  // Sécurité HTTP
  .use(elysiaHelmet())

  // Compression des réponses (gzip, brotli)
  .use(compression())

  // Ajout d'un identifiant de requête (utile pour les logs, debugging)
  .use(elysiaRequestId())

  // Logger HTTP simple et lisible
  .use(logysia())

  // Politique CORS sécurisée
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )

  // Rate limiting (anti-abus)
  .use(rateLimiter())

  // Authentification Better Auth
  .use(betterAuthPlugin)

  // Routes fonctionnelles principales
  .use(trackRoutes)
  .use(spotifyRoutes)

  // Gestion globale des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // Démarrage du serveur
  .listen(env.PORT);

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
