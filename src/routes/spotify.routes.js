import { Elysia } from 'elysia';
import { requireAdmin } from '../lib/auth/requireAdmin.js';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .get('/scrape', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin) return admin;

    return createSSEStream(send => handleSpotifyScrape(ctx, send));
  })

  .get('/sync', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin) return admin;

    return createSSEStream(send => handleSpotifySyncAll(ctx, send));
  })

  .get('/sync/:id', async ctx => {
    const admin = await requireAdmin(ctx);
    if (admin) return admin;

    const { id } = ctx.params;

    return createSSEStream(send => handleSpotifySyncById(ctx, send, id));
  });
