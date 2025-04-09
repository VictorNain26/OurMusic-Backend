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
 * Récupération de l’IP locale pour affichage console
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
 * 🚀 Instance Elysia.js propre et minimale
 */
const app = new Elysia()

  // ✅ Sécurité headers avec Helmet
  .use(
    elysiaHelmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  )

  // ✅ CORS global bien configuré
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    })
  )

  // ✅ Auth officiel (Better Auth expose déjà ses routes nativement)
  .use(auth)

  // ✅ Routes API privées
  .use(trackRoutes)
  .use(spotifyRoutes)

  // ✅ Healthcheck
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))

  // ✅ Page d’accueil
  .get('/', () => "Bienvenue sur l'API OurMusic !")

  // ✅ Global error handler
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return createError('Erreur interne du serveur', 500);
  });

/**
 * 🚀 Démarrage du serveur
 */
app.listen({ port: env.PORT, hostname: '0.0.0.0' }, ({ port }) => {
  const localIP = getLocalExternalIP();
  console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
  console.log(`➡️ Local : http://localhost:${port}`);
  console.log(`➡️ Réseau local : http://${localIP}:${port}`);
  console.log(`➡️ Production : https://ourmusic-api.ovh\n`);
});

/**
 * Gestion propre des erreurs non catchées
 */
process.on('uncaughtException', err => console.error('❌ Uncaught Exception:', err));
process.on('unhandledRejection', reason => console.error('❌ Unhandled Rejection:', reason));
