import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import { spotifyScrape, spotifySyncAll, spotifySyncById } from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .get(
    '/scrape',
    ({ request }) =>
      new Response(
        createSSEStream(sendEvent => spotifyScrape(request, sendEvent)),
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
    ({ request }) =>
      new Response(
        createSSEStream(sendEvent => spotifySyncAll(request, sendEvent)),
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
    '/sync/:id',
    ({ request, params }) =>
      new Response(
        createSSEStream(sendEvent => spotifySyncById(request, sendEvent, params.id)),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
  );
