import { Elysia } from 'elysia';
import * as trackService from '../services/trackService.js';
import { requireAuth } from '../middlewares/auth.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  // ❤️ Liker un morceau
  .post('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      return await trackService.likeTrack(ctx);
    } catch (err) {
      console.error('[Track Like Error]', err);
      return new Response(JSON.stringify({ error: "Erreur lors de l'ajout du morceau" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })

  // 📥 Récupérer les morceaux likés
  .get('/like', async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      return await trackService.getLikedTracks(ctx);
    } catch (err) {
      console.error('[Track List Error]', err);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des morceaux' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  })

  // ❌ Unliker un morceau (⚠️ ajout body: false pour éviter PARSE error)
  .delete('/like/:id', { body: false }, async ctx => {
    const auth = await requireAuth(ctx);
    if (auth !== true) return auth;

    try {
      return await trackService.unlikeTrack(ctx);
    } catch (err) {
      console.error('[Track Unlike Error]', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la suppression du morceau' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });
