import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';

import { initDatabase } from './db.js';
import { createAdminUser } from './services/authService.js';
import { authRoutes } from './routes/auth.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

import { db, schema } from './db/index.js';
import { eq } from 'drizzle-orm';

await initDatabase();
await createAdminUser();

const app = new Elysia()
  // 🌐 CORS plugin (nettoyage complet : headers manuels supprimés)
  .use(
    cors({
      origin: [/https:\/\/ourmusic\.fr$/, /https:\/\/ourmusic-api\.ovh$/],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // 🔐 Plugin JWT
  .use(
    jwt({
      name: 'jwt',
      secret: Bun.env.JWT_SECRET,
      exp: '15m',
    })
  )

  // 🔐 Middleware d’auth uniquement (CORS déjà géré par plugin)
  .onRequest(async ctx => {
    const token =
      ctx.request.headers.get('Authorization')?.replace('Bearer ', '').trim() ||
      ctx.cookie?.refresh?.value;

    if (token) {
      try {
        const decoded = await ctx.jwt.verify(token);
        const user = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, decoded.id))
          .then(r => r[0]);
        if (user) ctx.user = user;
      } catch (err) {
        console.warn('[JWT Decode Error]', err.message);
      }
    }
  })

  // ❌ Gestion globale des erreurs
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })

  // 🧩 Routes découpées par fonctionnalité
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)

  // 🚀 Démarrage
  .listen(Bun.env.PORT || 3000);

console.log(`✅ Elysia server listening on http://localhost:${app.server?.port}`);
