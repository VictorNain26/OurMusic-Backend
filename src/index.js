import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

import { env } from './config/env.js';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';

const app = new Elysia()
  // 🌐 Log propre des requêtes
  .onRequest(({ request }) => {
    const { method, url, headers } = request;
    const origin = headers.get('origin');
    const isPreflight = method === 'OPTIONS';
    console.log(
      `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} – Origin: ${origin}`
    );
  })

  // ✅ Middleware CORS (toujours en premier)
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // ✅ Authentification Better Auth + macro user/session
  .use(betterAuthPlugin)

  // ✅ Routes de l'API
  .use(trackRoutes)
  .use(spotifyRoutes)

  // ✅ Healthcheck standard
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))

  // ✅ Page d'accueil API
  .get('/', () => ({
    message: "Bienvenue sur l'API OurMusic 🎶",
  }))

  // ❌ Catch global des erreurs non gérées
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return {
      status: 500,
      error: 'Erreur interne du serveur',
    };
  })

  // ✅ Log de sortie des réponses
  .onAfterHandle(({ request, response }) => {
    console.log(
      `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response?.status ?? 200}`
    );
  })

  // ✅ Lancement du serveur
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Prod  : https://ourmusic-api.ovh\n`);

// 🔥 Gestion des erreurs fatales
process.on('uncaughtException', err => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', reason => {
  console.error('❌ Unhandled Rejection:', reason);
});
