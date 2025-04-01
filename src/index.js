import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { auth } from './lib/auth/auth.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

const app = new Elysia()
  .use(elysiaHelmet())
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  .use(rateLimiter())
  .mount(auth.handler)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .use(
    swagger({
      title: 'OurMusic API Documentation',
      version: '1.0.0',
      routePrefix: '/docs',
    })
  )
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
