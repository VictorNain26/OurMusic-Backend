import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { likeTrackSchema } from '../validators/trackValidator.js';
import * as trackService from '../services/trackService.js';

export const trackRoutes = new Elysia({ prefix: '/api/track' })
  .post(
    '/like',
    async ({ user, body }) => {
      const data = validateBody(likeTrackSchema, body);
      if (data?.error) return data;

      return await trackService.likeTrack({ user, body: data });
    },
    { auth: true }
  )

  .get(
    '/like',
    async ({ user }) => {
      return await trackService.getLikedTracks({ user });
    },
    { auth: true }
  )

  .delete(
    '/like/:trackId',
    async ({ user, params }) => {
      const trackId = params.trackId;

      if (!trackId || typeof trackId !== 'string') {
        return { status: 400, error: 'ID invalide' };
      }

      return await trackService.unlikeTrack({ user, id: trackId });
    },
    { auth: true }
  );
