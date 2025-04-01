import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { elysiaHelmet } from 'elysiajs-helmet';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { auth } from './lib/auth/auth.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyRoutes } from './routes/spotify.routes.js';

const app = new Elysia();

app
  .use(elysiaHelmet())
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Set-Cookie'],
    })
  )
  .use(rateLimiter())
  .use(trackRoutes)
  .use(spotifyRoutes)
  .mount('/auth', auth.handler)
  .use(
    swagger({
      path: '/swagger',
      exclude: ['/auth'],
      documentation: {
        info: {
          title: 'OurMusic API Documentation',
          version: '1.0.0',
          description: "Documentation de l'API OurMusic",
        },
        tags: [
          { name: 'Track', description: 'Routes pour la gestion des morceaux' },
          { name: 'Spotify', description: "Routes pour l'intégration Spotify" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    })
  )
  .get('/', () => new Response("Bienvenue sur l'API OurMusic !", { status: 200 }))
  .onError(({ error }) => {
    console.error('[Global Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  })
  .listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`✅ OurMusic Backend lancé sur http://localhost:${env.PORT}`);
