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
  // 🔒 Configuration CORS stricte et fiable
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  // 🔑 JWT tokens + refresh cookie
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: '15m',
    })
  )
  // 🧑 Middleware utilisateur injecté dynamiquement
  .use(userContext())

  // ✅ Routes fonctionnelles
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 🚨 Gestion d'erreurs globale
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // 🚀 Lancement serveur
  .listen(parseInt(env.PORT));

console.log(`✅ Elysia server listening on http://localhost:${env.PORT}`);
