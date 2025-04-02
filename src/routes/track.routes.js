import { Elysia } from 'elysia';
import { userMiddleware } from '../middlewares/userMiddleware.js';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { jsonResponse } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' }).guard(userMiddleware, app =>
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
      const { trackId } = ctx.params;

      if (!trackId || typeof trackId !== 'string') {
        console.warn('❌ Paramètre DELETE trackId invalide :', trackId);
        return jsonResponse({ error: 'ID invalide' }, 400);
      }

      return await trackService.unlikeTrack({ ...ctx, id: trackId });
    })
);
