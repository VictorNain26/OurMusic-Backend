import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })

  .get(
    '/scrape',
    ({ user }) => {
      return createSSEStream(send => handleSpotifyScrape(user, send));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  )

  .get(
    '/sync',
    ({ user }) => {
      return createSSEStream(send => handleSpotifySyncAll(user, send));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  )

  .get(
    '/sync/:id',
    ({ user, params }) => {
      return createSSEStream(send => handleSpotifySyncById(user, send, params.id));
    },
    {
      auth: {
        role: 'admin',
      },
    }
  );
