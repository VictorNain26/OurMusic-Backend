import { Elysia } from 'elysia';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
} from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' }).guard(
  adminMiddleware,
  app =>
    app
      .get(
        '/scrape',
        async ctx =>
          new Response(
            createSSEStream(send => handleSpotifyScrape(ctx, send)),
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              },
            }
          )
      )
      .get(
        '/sync',
        async ctx =>
          new Response(
            createSSEStream(send => handleSpotifySyncAll(ctx, send)),
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              },
            }
          )
      )
      .get('/sync/:id', async ctx => {
        const { id } = ctx.params;
        return new Response(
          createSSEStream(send => handleSpotifySyncById(ctx, send, id)),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          }
        );
      })
);
