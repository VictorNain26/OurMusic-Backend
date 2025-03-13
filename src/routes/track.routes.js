import { Elysia } from 'elysia';
import * as trackService from '../services/trackService.js';
import { requireAuth } from '../middlewares/auth.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;
    return trackService.likeTrack(ctx);
  })
  .get('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;
    return trackService.getLikedTracks(ctx);
  })
  .delete('/like/:id', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;
    return trackService.unlikeTrack(ctx);
  });
