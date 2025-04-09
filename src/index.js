import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import os from 'os';

import { env } from './config/env.js';
import { auth } from './lib/auth/index.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { createError } from './lib/response.js';

export function betterAuthView(context) {
  const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET', 'OPTIONS'];

  if (!BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': context.request.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return auth.handler(context.request);
}

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

const app = new Elysia();

// 🧩 Logger pré-requête
app.onRequest(({ request, set }) => {
  set.startTime = Date.now();
  const method = request.method;
  const url = request.url;
  const origin = request.headers.get('origin');
  const isPreflight = method === 'OPTIONS';
  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${
      isPreflight ? '(Preflight)' : ''
    } – Origin: ${origin}`
  );
});

// 🧩 Logger post-requête
app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${
      response.status
    } (${duration}ms)`
  );
});

//
// ✅ Ordre correct des middlewares
//

app
  // ✅ 1. Appliquer CORS globalement AVANT toutes les routes
  .use(
    cors({
      origin: ['http://localhost:8080', 'https://ourmusic.fr'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  )

  // ✅ 2. Helmet
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  )

  // ✅ 3. Swagger
  .use(swagger())

  // ✅ 4. Better Auth
  .all('/api/auth/*', betterAuthView)

  // ✅ 5. Routes API privées
  .use(trackRoutes)
  .use(spotifyRoutes)

  // ✅ 6. Healthcheck
  .get(
    '/health',
    () =>
      new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )

  // ✅ 7. Page d’accueil
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // ✅ 8. Global error handler
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

//
// 🚀 Serveur listen
//
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
