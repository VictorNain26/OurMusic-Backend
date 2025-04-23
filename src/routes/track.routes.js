import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';
import { auth } from '../lib/auth/index.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return error(401);
        return { user: session.user, session: session.session };
      },
    },
  })

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
