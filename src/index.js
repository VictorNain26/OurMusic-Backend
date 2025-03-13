import { Elysia } from 'elysia';
import { initDatabase } from './db.js';
import { authRoutes } from './routes/auth.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { createAdminUser } from './services/authService.js';

await initDatabase();

await createAdminUser();

const app = new Elysia()
  .onRequest(({ set, request }) => {
    const origin = request.headers.get('Origin') || '*';
    set.headers['Access-Control-Allow-Origin'] = origin;
    set.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    set.headers['Access-Control-Allow-Credentials'] = 'true';
  })
  .use(authRoutes)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .listen(Bun.env.PORT || 3000);

console.log(`✅ Elysia server listening on http://localhost:${app.server?.port}`);
