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
      return createSSEStream(send => handleSpotifyScrape({ user }, send));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  )

  // ✅ Sync toutes les playlists (admin uniquement)
  .get(
    '/sync',
    ({ user }) => {
      return createSSEStream(send => handleSpotifySyncAll({ user }, send));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  )

  // ✅ Sync playlist par ID (admin uniquement)
  .get(
    '/sync/:id',
    ({ user, params }) => {
      return createSSEStream(send => handleSpotifySyncById({ user }, send, params.id));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  );
