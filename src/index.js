import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';

import { env } from './config/env.js';
import { userContext } from './middlewares/userContext.js';
import { initDatabase } from './db.js';
import { createAdminUser } from './services/authService.js';

import { authRoutes } from './routes/auth.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

try {
  await initDatabase();
  await createAdminUser();
  console.log('✅ Database initialized and admin user ready.');
} catch (error) {
  console.error('[Database Initialization Error]', error);
  process.exit(1);
}

const app = new Elysia()
  // 🔒 Configuration CORS
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS, // Assurez-vous que c'est l'URL du frontend
      credentials: true, // Autoriser l'envoi des cookies et des tokens
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], // Bien inclure DELETE
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  // 🔑 Configuration JWT
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: '15m',
    })
  )
  // 🧑 Middleware d'injection utilisateur
  .use(userContext())

  // 🚦 Routes
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 🚨 Gestion centralisée des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // 🚀 Démarrage du serveur
  .listen(parseInt(env.PORT));

console.log(`✅ Elysia server listening on http://localhost:${env.PORT}`);
