import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import os from 'os';

import { env } from './config/env.js';
import { auth } from './lib/auth/index.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { createError } from './lib/response.js';

/**
 * ✅ Fonction utilitaire pour construire les en-têtes CORS en fonction de l'origine
 */
function getCorsHeaders(origin) {
  // On vérifie que l'origine est incluse dans la liste ALLOWED_ORIGINS
  // Sinon, on utilise la première de la liste comme fallback
  const allowedOrigin = env.ALLOWED_ORIGINS.includes(origin) ? origin : env.ALLOWED_ORIGINS;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * ✅ Handler Better Auth avec injection manuelle des en-têtes CORS
 */
export async function betterAuthView(context) {
  // On récupère l'origin depuis la requête HTTP
  const origin = context.request.headers.get('origin') || env.ALLOWED_ORIGINS;
  const corsHeaders = getCorsHeaders(origin);

  // Gestion préflight : si la méthode est OPTIONS, on renvoie direct les en-têtes sans body
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Sinon, on laisse la lib d'auth gérer la réponse
  const response = await auth.handler(context.request);
  const headers = new Headers(response.headers);

  // On injecte nos en-têtes CORS dans la réponse
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

/**
 * ✅ Récupération de l’IP locale (pour log ou usage réseau)
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
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response.status} (${duration}ms)`
  );
});

//
// ✅ Ordre des middlewares et routes
//
app
  // ✅ 1. Middleware global CORS
  //    Assure les en-têtes Access-Control-Allow-* pour toutes les routes "simples"
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS, // ex: ['http://localhost:8080','http://autre-domaine.com']
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

  // ✅ 3. Routes d'authentification (Better Auth)
  //    Ici, on gère la méthode OPTIONS manuellement via betterAuthView
  .all('/api/auth/*', betterAuthView)

  // ✅ 4. Routes API privées (le CORS global s'applique déjà)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // ✅ 5. Healthcheck
  .get(
    '/health',
    () =>
      new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )

  // ✅ 6. Page d’accueil
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // ✅ 7. Global error handler
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

// Gestion d'erreurs globales Node
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
