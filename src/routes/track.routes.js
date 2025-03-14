import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { requireAuth } from '../middlewares/auth.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    const data = validateBody(likeTrackSchema, ctx.body);
    if (data instanceof Response) return data;
    ctx.body = data;

    try {
      return await trackService.likeTrack(ctx);
    } catch (err) {
      console.error('[Track Like Error]', err);
      return new Response(JSON.stringify({ error: err.message || 'Erreur lors du like' }), {
        status: 500,
      });
    }
  })

  .get('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      return await trackService.getLikedTracks(ctx);
    } catch (err) {
      console.error('[Track Get Error]', err);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des morceaux' }),
        { status: 500 }
      );
    }
  })

  .delete('/like/:id', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      return await trackService.unlikeTrack(ctx);
    } catch (err) {
      console.error('[Track Unlike Error]', err);
      return new Response(JSON.stringify({ error: 'Erreur lors du unlike' }), { status: 500 });
    }
  });
