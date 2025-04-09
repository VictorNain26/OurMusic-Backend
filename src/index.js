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

/**
 * ✅ Headers CORS globaux et réutilisables
 */
function getCorsHeaders(origin) {
  const allowedOrigin = env.ALLOWED_ORIGINS.includes(origin) ? origin : env.ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * ✅ Handler Better Auth avec CORS proprement géré
 */
export function betterAuthView(context) {
  const { request } = context;
  const origin = request.headers.get('origin') || '*';
  const headers = getCorsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  return auth.handler(request).then(res => {
    const responseHeaders = new Headers(res.headers);
    Object.entries(headers).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  });
}

/**
 * ✅ Récupération de l’IP locale
 */
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

/**
 * 🚀 Instance Elysia
 */
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
// ✅ Ordre des middlewares et routes
//

app
  // ✅ 1. CORS global
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  )

  // ✅ 2. Helmet sécurité
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  )

  // ✅ 3. Swagger doc
  .use(swagger())

  // ✅ 4. Better Auth routes avec CORS propre
  .all('/api/auth/*', betterAuthView)

  // ✅ 5. Routes API privées
  .use(trackRoutes)
  .use(spotifyRoutes)

  // ✅ 6. Healthcheck
  .get('/health', () => {
    return new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // ✅ 7. Page d’accueil
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // ✅ 8. Global error handler
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

//
// 🚀 Démarrage du serveur
//
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
