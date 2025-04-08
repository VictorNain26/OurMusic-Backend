import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';

import { env } from './config/env.js';
import { auth } from './lib/auth/index.js'; // Better Auth instance
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { createError } from './lib/response.js';
import os from 'os';

// 🌍 Fonction pour obtenir l'IP locale (logs)
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

// Configuration CORS (adapter si besoin)
const corsConfig = {
  origin: env.ALLOWED_ORIGINS || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'], // ou 'Content-Type' si besoin
};

// 🚀 Application principale
const app = new Elysia();

// 📝 Logger – avant la requête
app.onRequest(({ request, set }) => {
  set.startTime = Date.now();
  const method = request.method;
  const url = request.url;
  const origin = request.headers.get('origin');
  const isPreflight = method === 'OPTIONS';
  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} – Origin: ${origin}`
  );
});

// 📝 Logger – après la requête
app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response.status} (${duration}ms)`
  );
});

// Montage de l’app
app
  // 1. CORS global
  .use(cors(corsConfig))

  // 2. Helmet
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Active-le en prod si besoin
    })
  )

  // 3. Swagger
  .use(swagger())

  // 4. Better Auth monté officiellement
  //    Ici, on monte le handler sur "/api/auth" => /api/auth/get-session, etc.
  .mount('/api/auth', auth.handler)

  // 5. Vos routes (Spotify / Tracks)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 6. Healthcheck
  .get(
    '/health',
    () =>
      new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )

  // 7. Route racine
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // 8. Handler global d'erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

// Lancement du serveur
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

// Logs démarrage
const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

// Sécurité : catch erreurs globales Node
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
