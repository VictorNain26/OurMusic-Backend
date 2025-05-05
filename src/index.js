import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './config/env.js';
import { betterAuthPlugin } from './lib/auth/betterAuthPlugin.js';
import { spotifyRoutes } from './routes/spotify.routes.js';
import { trackRoutes } from './routes/track.routes.js';
import { spotifyOauthRoutes } from './routes/spotify-oauth.routes.js';
import { spotifySyncRoutes } from './routes/spotify-sync.routes.js';

const app = new Elysia();

// ✅ Log propre des requêtes
app.onRequest(({ request }) => {
  const { method, url, headers } = request;
  const origin = headers.get('origin');
  const isPreflight = method === 'OPTIONS';
  console.log(
    `[${new Date().toISOString()}] 📥 ${method} ${url} ${isPreflight ? '(Preflight)' : ''} – Origin: ${origin}`
  );
});

// ✅ CORS
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ✅ Auth BetterAuth
app.use(betterAuthPlugin);

// ✅ Routes
app.use(trackRoutes);
app.use(spotifyRoutes);
app.use(spotifyOauthRoutes);
app.use(spotifySyncRoutes);

// ✅ Healthcheck
app.get('/health', () => ({
  status: 'ok',
  uptime: process.uptime(),
}));

// ✅ Accueil
app.get('/', () => ({
  message: "Bienvenue sur l'API OurMusic 🎶",
}));

// ❌ Gestion des erreurs
app.onError(({ error }) => {
  console.error('[Global Error]', error);
  return {
    status: 500,
    error: 'Erreur interne du serveur',
  };
});

// ✅ Log sortie
app.onAfterHandle(({ request, response }) => {
  console.log(
    `[${new Date().toISOString()}] ✅ ${request.method} ${request.url} → ${response?.status ?? 200}`
  );
});

// ✅ CRON : uniquement si activé
if (env.ENABLE_CRON) {
  const { cron } = await import('@elysiajs/cron');
  const { runSpotifyCronSync } = await import('./jobs/spotify.cron.js');
  const { runScrapeCronJob } = await import('./jobs/scrape.cron.js');

  app.use(
    cron({
      name: 'spotify-sync',
      pattern: '0 3 * * 1',
      run: async () => {
        console.log('[CRON] 🎧 Tâche cron Spotify sync');
        await runSpotifyCronSync();
      },
    })
  );

  app.use(
    cron({
      name: 'scrape-task',
      pattern: '0 3 * * 0,3',
      run: async () => {
        console.log('[CRON] 🔎 Tâche cron scraping HypeMachine');
        await runScrapeCronJob();
      },
    })
  );
}

// ✅ Lancement du serveur
app.listen({ port: env.PORT, hostname: '0.0.0.0' });

console.log(`\n✅ OurMusic Backend est lancé et accessible :`);
console.log(`➡️ Local : http://localhost:${env.PORT}`);
console.log(`➡️ Prod  : https://ourmusic-api.ovh\n`);

// 🔥 Gestion erreurs fatales
process.on('uncaughtException', err => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', reason => {
  console.error('❌ Unhandled Rejection:', reason);
});
