import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })

  // ✅ Scrape Spotify (admin uniquement)
  .get(
    '/scrape',
    ({ user }) => {
      if (user.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return createSSEStream(send => handleSpotifyScrape({ user }, send));
    },
    { auth: true }
  )

  // ✅ Sync toutes les playlists (admin uniquement)
  .get(
    '/sync',
    ({ user }) => {
      if (user.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return createSSEStream(send => handleSpotifySyncAll({ user }, send));
    },
    { auth: true }
  )

  // ✅ Sync playlist par ID (admin uniquement)
  .get(
    '/sync/:id',
    ({ user, params }) => {
      if (user.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return createSSEStream(send => handleSpotifySyncById({ user }, send, params.id));
    },
    { auth: true }
  );
