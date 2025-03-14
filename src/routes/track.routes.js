import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { requireAuth } from '../middlewares/auth.js';
import { jsonResponse, createError } from '../lib/response.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    const data = validateBody(likeTrackSchema, ctx.body);
    if (data instanceof Response) return data;

    try {
      const result = await trackService.likeTrack({ ...ctx, body: data });
      return result;
    } catch (err) {
      console.error('[Track Like Error]', err);
      return createError('Erreur serveur lors du like', 500);
    }
  })

  .get('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      const result = await trackService.getLikedTracks(ctx);
      return result;
    } catch (err) {
      console.error('[Track Get Error]', err);
      return createError('Erreur serveur lors de la récupération des morceaux', 500);
    }
  })

  .delete('/like/:id', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    const id = parseInt(ctx.params.id);
    if (isNaN(id)) return createError('ID invalide', 400);

    console.log('[Route DELETE] id reçu =', id);

    try {
      const result = await trackService.unlikeTrack({ ...ctx, id });
      return result;
    } catch (err) {
      console.error('[Track Unlike Error]', err);
      return createError('Erreur serveur lors du unlike', 500);
    }
  });
