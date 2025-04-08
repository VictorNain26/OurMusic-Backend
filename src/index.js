import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env.js';
import { auth } from './lib/auth/index.js';
import { betterAuthView } from './lib/auth/betterAuthView.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';

const betterAuth = new Elysia({ name: 'better-auth' }).all('/api/auth/*', betterAuthView).macro({
  auth: {
    async resolve({ error, request: { headers } }) {
      const session = await auth.api.getSession({ headers });

      if (!session) return error(401);

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});

const app = new Elysia();

app
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  .use(elysiaHelmet())
  .use(swagger())
  .use(betterAuth)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`✅ OurMusic Backend lancé sur port ${env.PORT}`);
app.routes.forEach(route => {
  console.log(`📣 ${route.method} ${route.path}`);
});
