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
      if (user?.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return new Response(
        createSSEStream(send => handleSpotifyScrape({ user }, send)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    },
    { auth: true }
  )

  .get(
    '/sync',
    ({ user }) => {
      if (user?.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return new Response(
        createSSEStream(send => handleSpotifySyncAll({ user }, send)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    },
    { auth: true }
  )

  .get(
    '/sync/:id',
    ({ user, params }) => {
      if (user?.role !== 'admin') {
        return { status: 403, error: '⛔ Accès admin requis' };
      }

      return new Response(
        createSSEStream(send => handleSpotifySyncById({ user }, send, params.id)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      );
    },
    { auth: true }
  );
