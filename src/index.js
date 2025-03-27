import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env.js';
import { initDatabase } from './db.js';
import { betterAuthPlugin } from './config/auth.config.js';
import { elysiaHelmet } from 'elysiajs-helmet';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { compression } from 'elysia-compression';
import { elysiaRequestId } from 'elysia-request-id';
import { logysia } from 'logysia';

await initDatabase();

const app = new Elysia()
  // 🛡 Sécurité HTTP avec Helmet
  .use(elysiaHelmet())

  // 🧼 Compression des réponses HTTP (gzip/brotli)
  .use(compression())

  // 🧩 Ajout d'un X-Request-ID pour chaque requête
  .use(elysiaRequestId())

  // 📜 Logger HTTP lisible
  .use(logysia())

  // 🌐 CORS sécurisé
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )

  // 🛡 Rate Limiting basique maison (anti-abus)
  .use(rateLimiter())

  // 🔐 Authentification avec Better Auth
  .use(betterAuthPlugin)

  // 📦 Routes métier
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
