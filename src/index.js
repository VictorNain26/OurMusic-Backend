import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
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

const app = new Elysia();

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

app.onAfterHandle(({ response, set }) => {
  if (!response) return;
  if (response instanceof ReadableStream) return response;

  if (response?.error) {
    set.status = response.status || 500;
    return {
      success: false,
      error: response.error,
      status: set.status,
    };
  }

  set.status = response.status || 200;
  return {
    success: true,
    data: response,
    status: set.status,
  };
});

app.onAfterHandle(({ request, set, response }) => {
  const duration = Date.now() - set.startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response?.status || 200} (${duration}ms)`
  );
});

app
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    })
  )
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  )
  .use(betterAuthPlugin)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))
  .get('/', () => ({
    message: "Bienvenue sur l'API OurMusic !",
  }))
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return { status: 500, error: 'Erreur interne du serveur' };
  });

app.listen({ port: env.PORT, hostname: '0.0.0.0' });

const localIP = getLocalExternalIP();
console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Réseau local : http://${localIP}:${env.PORT}`);
console.log(`➡️ Nom de domaine : https://ourmusic-api.ovh\n`);

process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
