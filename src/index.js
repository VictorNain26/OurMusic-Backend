import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env.js';
import { auth } from './lib/auth/index.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

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
  .mount(auth.handler)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .use(swagger())
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
console.log(app.routes.map(route => `${route.method} ${route.path}`));
