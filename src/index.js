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

// 🌍 Fonction utilitaire pour récupérer l'IP locale externe
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

// 🛡️ Better Auth middleware macro
const betterAuth = new Elysia({ name: 'better-auth' }).all('/api/auth/*', betterAuthView).macro({
  auth: {
    async resolve({ error, request: { headers } }) {
      const session = await auth.api.getSession({ headers });

      if (!session) return error(401);

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});

// 🚀 Crée l'app Elysia
const app = new Elysia();

// 📝 Logger amélioré avec temps de traitement + status code
app.onRequest(({ request, set }) => {
  const start = Date.now();
  set.startTime = start;

  const method = request.method;
  const url = request.url;
  const isPreflight = method === 'OPTIONS';

  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''}`
  );
});

app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  const status = response.status;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${status} (${duration}ms)`
  );
});

// ✅ Middleware global pour injecter les headers CORS dans toutes les réponses
app.onBeforeHandle(({ set }) => {
  set.headers = {
    ...set.headers,
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS.includes('*')
      ? '*'
      : env.ALLOWED_ORIGINS.join(','),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
});

// ✅ Handler global pour OPTIONS (preflight)
app.options('/*', () => new Response(null, { status: 204 }));

app
  // 🌐 CORS configuration
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )

  // 🛡️ Helmet pour sécuriser les headers HTTP
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Désactivé en dev, à activer pour la prod stricte
    })
  )

  // 📄 Swagger pour la documentation API
  .use(swagger())

  // 🔐 Authentification Better Auth
  .use(betterAuth)

  // 🎶 Routes API principales
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 💚 Healthcheck pour monitoring (ex: Docker Healthcheck)
  .get('/health', () => {
    return new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // 🏠 Route racine conviviale
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // ❌ Global error handler
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

// 🚀 Lancement du serveur sur toutes les interfaces réseau (0.0.0.0)
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

// ✅ Confirmation de démarrage avec IP locale et nom de domaine
const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

// 🚨 Sécurité bonus : catch process unhandled errors
process.on('uncaughtException', err => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', reason => {
  console.error('❌ Unhandled Rejection:', reason);
});
