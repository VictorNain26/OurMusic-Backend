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

// Initialisation de la base
await initDatabase();
await createAdminUser();

const app = new Elysia()
  // CORS
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  // JWT
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: '15m',
    })
  )
  // Middleware d’injection utilisateur
  .use(userContext())

  // Routes
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // Gestion des erreurs globales
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // Démarrage du serveur
  .listen(env.PORT);

console.log(`✅ Elysia server listening on http://localhost:${app.server?.port}`);
