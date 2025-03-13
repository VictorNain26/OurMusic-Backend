import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { cookie } from '@elysiajs/cookie';

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
  .use(cookie())
  .use(
    jwt({
      name: 'jwt',
      secret: Bun.env.JWT_SECRET,
      exp: '15m',
    })
  )
  .onRequest(async ctx => {
    const origin = ctx.request.headers.get('Origin') || '*';
    ctx.set.headers['Access-Control-Allow-Origin'] = origin;
    ctx.set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    ctx.set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    ctx.set.headers['Access-Control-Allow-Credentials'] = 'true';

    const authHeader = ctx.request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const decoded = await ctx.jwt.verify(authHeader.replace('Bearer ', '').trim());
        const user = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, decoded.id))
          .then(r => r[0]);
        if (user) ctx.user = user;
      } catch {}
    }
  })
  .options('/*', () => new Response(null, { status: 204 }))
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .listen(Bun.env.PORT || 3000);

console.log(`✅ Elysia listening on http://localhost:${app.server?.port}`);
