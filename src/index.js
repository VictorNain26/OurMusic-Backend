import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import os from 'os';

import { env } from './config/env.js';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';

function getLocalExternalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const app = new Elysia()

  // Log des requêtes entrantes
  .onRequest(({ request }) => {
    const method = request.method;
    const url = request.url;
    const origin = request.headers.get('origin');
    const isPreflight = method === 'OPTIONS';

    console.log(
      `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} – Origin: ${origin}`
    );
  })

  // ✅ Plugin: CORS toujours en premier
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  )

  // ✅ Plugin: Better Auth correctement monté après CORS + Helmet
  .use(betterAuthPlugin)

  // ✅ Routes de l'application
  .use(trackRoutes)
  .use(spotifyRoutes)

  // Healthcheck
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))

  // Root welcome
  .get('/', () => ({
    message: "Bienvenue sur l'API OurMusic 🎶",
  }))

  // Global error handler
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return { status: 500, error: 'Erreur interne du serveur' };
  })

  // Log des réponses
  .onAfterHandle(({ request, response }) => {
    const status = response?.status ?? 200;
    console.log(`[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${status}`);
  })

  // Start server
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

// Fatal errors
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
