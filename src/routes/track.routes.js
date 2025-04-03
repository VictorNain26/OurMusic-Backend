import { Elysia } from 'elysia';
import { requireUser } from '../lib/auth/requireUser.js';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { jsonResponse } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ctx => {
    const res = await requireUser(ctx);
    if (res instanceof Response) return res;

    const data = validateBody(likeTrackSchema, ctx.body);
    if (data instanceof Response) return data;

    return await trackService.likeTrack({ ...ctx, body: data });
  })

  .get('/like', async ctx => {
    const res = await requireUser(ctx);
    if (res instanceof Response) return res;

    return await trackService.getLikedTracks(ctx);
  })

  .delete('/like/:trackId', async ctx => {
    const res = await requireUser(ctx);
    if (res instanceof Response) return res;

    const { trackId } = ctx.params;

    if (!trackId || typeof trackId !== 'string') {
      return jsonResponse({ error: 'ID invalide' }, 400);
    }

    return await trackService.unlikeTrack({ ...ctx, id: trackId });
  });
