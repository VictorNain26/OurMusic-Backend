import { Elysia } from 'elysia';
import { auth } from '../plugins/auth.js';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { jsonResponse } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' }).guard(auth.guard(), app =>
  app
    .post('/like', async ctx => {
      const data = validateBody(likeTrackSchema, ctx.body);
      if (data instanceof Response) return data;

      return await trackService.likeTrack({ ...ctx, body: data });
    })
    .get('/like', async ctx => {
      return await trackService.getLikedTracks(ctx);
    })
    .delete('/like/:trackId', async ctx => {
      const trackIdParam = ctx.params?.trackId;
      const parsedId = parseInt(trackIdParam, 10);

      if (!trackIdParam || isNaN(parsedId) || parsedId <= 0) {
        console.warn('❌ Paramètre DELETE trackId invalide :', trackIdParam);
        return jsonResponse({ error: 'ID invalide (fallback)' }, 400);
      }

      return await trackService.unlikeTrack({ ...ctx, id: parsedId });
    })
);
