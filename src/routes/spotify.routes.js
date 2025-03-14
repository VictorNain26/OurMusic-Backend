import { Elysia } from 'elysia';
import { requireAdmin } from '../middlewares/auth.js';
import { createSSEStream } from '../utils/sse.js';
import { spotifyScrape, spotifySyncAll, spotifySyncById } from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  // 🎯 Scrape depuis HypeMachine et enrichissement Spotify
  .get('/scrape', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

    try {
      return new Response(
        createSSEStream(sendEvent => spotifyScrape(ctx, sendEvent)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    } catch (err) {
      console.error('[Spotify Scrape Error]', err);
      return new Response(JSON.stringify({ error: 'Erreur lors du scraping Spotify' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })

  // 🔁 Sync globale toutes playlists OurMusic
  .get('/sync', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

    try {
      return new Response(
        createSSEStream(sendEvent => spotifySyncAll(ctx, sendEvent)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    } catch (err) {
      console.error('[Spotify Sync All Error]', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la synchronisation Spotify' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })

  // 🔁 Sync d'une seule playlist par ID
  .get('/sync/:id', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

    try {
      const playlistId = ctx.params.id;
      return new Response(
        createSSEStream(sendEvent => spotifySyncById(ctx, sendEvent, playlistId)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    } catch (err) {
      console.error('[Spotify Sync By ID Error]', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la synchronisation playlist' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });
