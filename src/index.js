import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

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

  // 🔐 Plugin JWT
  .use(
    jwt({
      name: 'jwt',
      secret: Bun.env.JWT_SECRET,
      exp: '15m',
    })
  )

  // 🌐 Middleware CORS + Auth
  .onRequest(async ctx => {
    const origin = ctx.request.headers.get('Origin') || '*';
    ctx.set.headers['Access-Control-Allow-Origin'] = origin;
    ctx.set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    ctx.set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    ctx.set.headers['Access-Control-Allow-Credentials'] = 'true';

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

  // 🧼 OPTIONS preflight
  .options('/*', () => new Response(null, { status: 204 }))

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
