import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { requireAuth } from '../middlewares/auth.js';
import { createError } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })

  // ✅ Like un morceau
  .post('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    const data = validateBody(likeTrackSchema, ctx.body);
    if (data instanceof Response) return data;

    return await trackService.likeTrack({ ...ctx, body: data });
  })

  // ✅ Récupère les morceaux likés
  .get('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    return await trackService.getLikedTracks(ctx);
  })

  // ✅ Supprime un morceau liké
  .delete('/like/:trackId', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    const id = parseInt(ctx.params.trackId);
    if (isNaN(id)) return createError('ID invalide', 400);

    return await trackService.unlikeTrack({ ...ctx, id });
  });
