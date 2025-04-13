import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })

  // ✅ Liker un morceau
  .post(
    '/like',
    async ({ user, body }) => {
      const data = validateBody(likeTrackSchema, body);
      if (data?.error) return data;

      return trackService.likeTrack({ user, body: data });
    },
    {
      auth: true,
    }
  )

  // ✅ Récupérer les morceaux likés
  .get(
    '/like',
    async ({ user }) => {
      return trackService.getLikedTracks({ user });
    },
    {
      auth: true,
    }
  )

  // ✅ Supprimer un morceau liké
  .delete(
    '/like/:trackId',
    async ({ user, params }) => {
      const { trackId } = params;

      if (!trackId || typeof trackId !== 'string') {
        return { status: 400, error: 'ID invalide' };
      }

      return trackService.unlikeTrack({ user, id: trackId });
    },
    {
      auth: true,
    }
  );
