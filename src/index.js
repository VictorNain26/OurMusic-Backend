import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { env } from './config/env.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { auth } from './plugins/auth.js';

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
  .use(auth)
  .use(trackRoutes)
  .use(spotifyRoutes)
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
