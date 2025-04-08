import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env.js';
import { auth } from './lib/auth/index.js';
import { betterAuthView } from './lib/auth/betterAuthView.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { createError } from './lib/response.js';
import os from 'os';

// 🌍 Fonction pour obtenir l'IP locale
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

// 🚀 Application principale
const app = new Elysia();

// 📝 Logger clean
app.onRequest(({ request, set }) => {
  set.startTime = Date.now();
  const method = request.method;
  const url = request.url;
  const origin = request.headers.get('origin');
  const isPreflight = method === 'OPTIONS';
  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} — Origin: ${origin}`
  );
});

app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response.status} (${duration}ms)`
  );
});

// ✅ Middleware global
app
  .use(cors()) // Appliquer CORS globalement à toutes les routes
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Active-le en prod si besoin
    })
  )
  .use(swagger())

  // 🔐 Authentification sans CORS pour tester
  .all('/api/auth/*', betterAuthView)

  // 🎶 Routes API
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 💚 Healthcheck
  .get(
    '/health',
    () =>
      new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )

  // 🏠 Route racine
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // ❌ Handler global des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

// 🚀 Lancement du serveur
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

// ✅ Logs démarrage clean
const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

// 🚨 Sécurité : catch erreurs globales
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
