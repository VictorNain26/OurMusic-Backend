import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { createError, jsonResponse } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  // ✅ Like un morceau
  .post('/like', async ctx => {
    const user = ctx.auth;
    const data = validateBody(likeTrackSchema, ctx.body);
    if (data instanceof Response) return data;

    return await trackService.likeTrack({ ...ctx, user, body: data });
  })

  // ✅ Récupère les morceaux likés
  .get('/like', async ctx => {
    const user = ctx.auth;
    return await trackService.getLikedTracks({ ...ctx, user });
  })

  // ✅ Supprime un morceau liké (unlike)
  .delete('/like/:trackId', async ctx => {
    const trackIdParam = ctx.params?.trackId;
    const parsedId = parseInt(trackIdParam, 10);

    if (!trackIdParam || isNaN(parsedId) || parsedId <= 0) {
      console.warn('❌ Paramètre DELETE trackId invalide :', trackIdParam);
      return jsonResponse({ error: 'ID invalide (fallback)' }, 400);
    }

    const user = ctx.auth;
    return await trackService.unlikeTrack({ ...ctx, user, id: parsedId });
  });
