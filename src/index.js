import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import os from 'os';

// Votre config, par ex. .env
import { env } from './config/env.js';

// Better Auth import
import { auth } from './lib/auth/index.js';

// Vos routes
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';

// Votre helper d'erreur
import { createError } from './lib/response.js';

//
// 1) Fonction "betterAuthView" (d’après la doc “Mount Handler”)
//
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return auth.handler(context.request);
}

// 🌍 Fonction pour obtenir l'IP locale (pour logs)
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

//
// 2) Configuration CORS (si vous voulez plus de contrôle, adaptez ci-dessous)
//
const corsConfig = {
  origin: env.ALLOWED_ORIGINS || 'http://localhost:8080',

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],

  exposedHeaders: [
    'Set-Cookie',
    'Content-Type',
    'Authorization',
    'Content-Length',
    'X-Knowledge-Base',
  ],

  optionsSuccessStatus: 200,
};

//
// 3) Création de l’application Elysia
//
const app = new Elysia();

//
// 4) Logger avant la requête
//
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

//
// 5) Logger après la requête
//
app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${
      response.status
    } (${duration}ms)`
  );
});

//
// 6) Montage de l’app avec middlewares et routes
//
app
  // 6.1 – Appliquer CORS globalement
  .use(cors(corsConfig))

  // 6.2 – Helmet
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Activez en prod au besoin
    })
  )

  // 6.3 – Swagger
  .use(swagger())

  // 6.4 – Better Auth sur "/api/auth/*"
  .all('/api/auth/*', betterAuthView)

  // 6.5 – Vos routes
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 6.6 – Healthcheck
  .get(
    '/health',
    () =>
      new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  )

  // 6.7 – Page d’accueil
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))

  // 6.8 – Handler global des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

//
// 7) Lancement du serveur
//
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

// Logs de démarrage
const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

//
// 8) Catch global Node
//
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
