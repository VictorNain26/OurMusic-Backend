import { Elysia } from 'elysia';
import { createSSEStream } from '../utils/sse.js';
import {
  handleSpotifyScrape,
  handleSpotifySyncAll,
  handleSpotifySyncById,
  cleanupSpotdlFiles,
  checkSpotdlInstalled,
} from '../services/spotifyService.js';

export const spotifyRoutes = new Elysia({ prefix: '/api/live/spotify' })

  // 🎯 Scraper automatiquement plusieurs genres
  .get('/scrape', ({ user }) => createSSEStream(send => handleSpotifyScrape(user, send)), {
    auth: { role: 'admin' },
  })

  // 🔁 Synchroniser toutes les playlists "OurMusic"
  .get('/sync', ({ user }) => createSSEStream(send => handleSpotifySyncAll(user, send)), {
    auth: { role: 'admin' },
  })

  // 🎵 Synchroniser une playlist spécifique par ID
  .get(
    '/sync/:id',
    ({ user, params }) => createSSEStream(send => handleSpotifySyncById(user, send, params.id)),
    { auth: { role: 'admin' } }
  )

  // 🔍 Vérifier que spotDL est installé
  .get(
    '/spotdl/version',
    async () => {
      const version = await checkSpotdlInstalled();
      return { version };
    },
    {
      auth: { role: 'admin' },
    }
  )

  // 🧹 Nettoyer les fichiers .spotdl et .temp
  .get('/spotdl/cleanup', () => createSSEStream(send => cleanupSpotdlFiles(send)), {
    auth: { role: 'admin' },
  });
