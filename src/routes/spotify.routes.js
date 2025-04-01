import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';
import { jsonResponse } from '../lib/response.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' }).guard(
  authMiddleware,
  app =>
    app
      .get('/scrape', async ctx => {
        const user = ctx.user;
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
      .get('/sync', async ctx => {
        const user = ctx.user;
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
      .get('/sync/:id', async ctx => {
        const user = ctx.user;
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
      })
);
