import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import { spotifyScrape, spotifySyncAll, spotifySyncById } from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .get(
    '/scrape',
    () =>
      new Response(
        createSSEStream(sendEvent => spotifyScrape({}, sendEvent)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
      ),
  )
  .get(
    '/sync',
    () =>
      new Response(
        createSSEStream(sendEvent => spotifySyncAll({}, sendEvent)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
      ),
  )
  .get(
    '/sync/:id',
    async({ params }) =>
      new Response(
        createSSEStream(sendEvent => spotifySyncById({}, sendEvent, params.id)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
      ),
  );
