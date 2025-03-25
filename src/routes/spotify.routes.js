import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';
import { jsonResponse } from '../lib/response.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })

  // 🎯 Scrape depuis HypeMachine et enrichissement Spotify
  .get('/scrape', async ctx => {
    const user = ctx.auth;
    if (user.role !== 'admin') return jsonResponse({ error: 'Accès refusé' }, 403);

    return new Response(
      createSSEStream(send => handleSpotifyScrape(ctx, send)),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  })

  // 🔁 Sync globale des playlists OurMusic
  .get('/sync', async ctx => {
    const user = ctx.auth;
    if (user.role !== 'admin') return jsonResponse({ error: 'Accès refusé' }, 403);

    return new Response(
      createSSEStream(send => handleSpotifySyncAll(ctx, send)),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  })

  // 🔁 Sync d'une playlist par ID
  .get('/sync/:id', async ctx => {
    const user = ctx.auth;
    if (user.role !== 'admin') return jsonResponse({ error: 'Accès refusé' }, 403);

    const { id } = ctx.params;

    return new Response(
      createSSEStream(send => handleSpotifySyncById(ctx, send, id)),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  });
