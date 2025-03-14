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

  .delete('/like/:trackId', async ({ params, user, set }) => {
    console.log('[DELETE] Entrée dans route DELETE /like/:trackId');

    const id = parseInt(params.trackId);
    if (isNaN(id)) {
      console.log('[DELETE] ID non valide reçu:', params.trackId);
      set.status = 400;
      return { error: 'ID invalide' };
    }

    console.log('[DELETE] ID parsé:', id);

    if (!user) {
      set.status = 401;
      return { error: 'Non authentifié' };
    }

    try {
      const existingTrack = await db
        .select()
        .from(schema.likedTracks)
        .where(and(eq(schema.likedTracks.id, id), eq(schema.likedTracks.userId, user.id)))
        .limit(1)
        .then(res => res[0]);

      if (!existingTrack) {
        set.status = 404;
        return { error: 'Track non trouvé' };
      }

      await db
        .delete(schema.likedTracks)
        .where(and(eq(schema.likedTracks.id, id), eq(schema.likedTracks.userId, user.id)));

      return { message: 'Track supprimé', id };
    } catch (err) {
      console.error('[DELETE ERROR]', err);
      set.status = 500;
      return { error: 'Erreur serveur lors du unlike' };
    }
  });
