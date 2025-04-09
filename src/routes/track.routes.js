import { Elysia } from 'elysia';
import { requireUser } from '../lib/auth/requireUser.js';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ctx => {
    const res = await requireUser(ctx);
    if (res) return res;

    const data = validateBody(likeTrackSchema, ctx.body);
    if (data?.error) return data;

    return await trackService.likeTrack({ ...ctx, body: data });
  })

  .get('/like', async ctx => {
    const res = await requireUser(ctx);
    if (res) return res;

    return await trackService.getLikedTracks(ctx);
  })

  .delete('/like/:trackId', async ctx => {
    const res = await requireUser(ctx);
    if (res) return res;

    const { trackId } = ctx.params;

    if (!trackId || typeof trackId !== 'string') {
      return { status: 400, error: 'ID invalide' };
    }

    return await trackService.unlikeTrack({ ...ctx, id: trackId });
  });
