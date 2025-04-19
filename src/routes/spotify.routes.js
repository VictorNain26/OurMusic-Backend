// src/routes/spotify.routes.js
import { Elysia } from 'elysia';
import { spotifyService } from '../services/spotifyService';
import { sendSSE } from '../lib/sse';
import { authenticate } from '../middleware/authenticate';
import { z } from 'zod';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })
  .use(authenticate)
  .get('/sync', async ({ user, request, set }) => {
    return sendSSE(request, async send => {
      try {
        await spotifyService.syncAllPlaylists(send, user.id);
      } catch (err) {
        console.error('[syncAllPlaylists] Error:', err);
        send({ message: '❌ Erreur lors de la synchronisation globale.', error: err.message });
        throw err;
      }
    });
  })
  .get('/sync/:id', async ({ user, request, params, set }) => {
    const { id } = z.object({ id: z.string().min(3) }).parse(params);

    return sendSSE(request, async send => {
      try {
        await spotifyService.syncSinglePlaylist(send, id, user.id);
      } catch (err) {
        console.error('[syncSinglePlaylist] Error:', err);
        send({
          message: '❌ Erreur lors de la synchronisation de la playlist.',
          error: err.message,
        });
        throw err;
      }
    });
  })
  .get('/scrape', async ({ user, request }) => {
    return sendSSE(request, async send => {
      try {
        await spotifyService.scrapeAllPlaylists(send, user.id);
      } catch (err) {
        console.error('[scrapeAllPlaylists] Error:', err);
        send({ message: '❌ Erreur lors du scraping des playlists.', error: err.message });
        throw err;
      }
    });
  });
