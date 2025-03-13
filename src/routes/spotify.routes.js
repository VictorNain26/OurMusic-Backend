import { Elysia } from 'elysia';
import { requireAdmin } from '../middlewares/auth.js';
import { createSSEStream } from '../utils/sse.js';
import { spotifyScrape, spotifySyncAll, spotifySyncById } from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .get('/scrape', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

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
  })

  .get('/sync', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

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
  })

  .get('/sync/:id', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin !== true) return admin;

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
  });
