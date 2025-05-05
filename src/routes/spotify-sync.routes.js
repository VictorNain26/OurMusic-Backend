// src/routes/spotify-sync.routes.js
import { Elysia } from 'elysia';
import { auth } from '../lib/auth/index.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import { getAllUserPlaylists } from '../spotify.js';
import { getFreshSpotifyAccessToken } from '../services/spotifyTokenHelper.js';
import { searchTrackOnSpotify } from '../spotify.js';

/* découpe un tableau en paquets de n (utile pour l’API Spotify) */
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

const TARGET_NAME = 'OurMusic - Morceaux Aimés';

export const spotifySyncRoutes = new Elysia({ prefix: '/api/spotify' })
  /* ─────────── macro auth ─────────── */
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const sess = await auth.api.getSession({ headers });
        if (!sess) return error(401);
        return { user: sess.user, session: sess.session };
      },
    },
  })

  /* ─────────── POST /sync-liked ─────────── */
  .post(
    '/sync-liked',
    async ({ user }) => {
      /* 1. likes */
      const likedTracks = await db
        .select()
        .from(schema.likedTracks)
        .where(eq(schema.likedTracks.userId, user.id));

      if (!likedTracks.length) return { status: 400, error: 'Aucun morceau liké.' };

      /* 2. compte Spotify */
      const spotifyAccount = await db.query.account.findFirst({
        where: and(eq(schema.account.userId, user.id), eq(schema.account.providerId, 'spotify')),
      });
      if (!spotifyAccount) return { status: 400, error: 'Aucun compte Spotify lié.' };

      const token = await getFreshSpotifyAccessToken(spotifyAccount);

      /* 3. conversion likes -> URI */
      const likedUris = [];
      for (const t of likedTracks) {
        const uri = await searchTrackOnSpotify(t.artist, t.title, token);
        if (uri) likedUris.push(uri);
      }
      if (!likedUris.length)
        return { status: 500, error: 'Aucune correspondance trouvée sur Spotify.' };

      /* 4. récupérer / créer la playlist (logique identique au scraping) */
      const playlists = await getAllUserPlaylists(token);
      console.log('Playlists', playlists);

      let playlist = playlists.find(
        p => p.name && p.name.toLowerCase() === TARGET_NAME.toLowerCase()
      );

      if (!playlist) {
        const { data } = await axios.post(
          'https://api.spotify.com/v1/me/playlists',
          {
            name: TARGET_NAME,
            public: false,
            description: 'Synchronisation automatique depuis OurMusic',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        playlist = data;
      }

      /* 5. contenu actuel de la playlist */
      const existingUris = [];
      let url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri)),next&limit=100`;
      while (url) {
        const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        data.items.forEach(i => i.track?.uri && existingUris.push(i.track.uri));
        url = data.next;
      }

      /* 6. diff */
      const toAdd = likedUris.filter(u => !existingUris.includes(u));
      const toRemove = existingUris.filter(u => !likedUris.includes(u));

      /* 7. appliquer */
      for (const chunkUris of chunk(toRemove, 100)) {
        await axios.delete(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { tracks: chunkUris.map(uri => ({ uri })) },
        });
      }

      for (const chunkUris of chunk(toAdd, 100)) {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          { uris: chunkUris },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      /* 8. réponse */
      return {
        message: '✅ Synchronisation terminée',
        added: toAdd.length,
        removed: toRemove.length,
        total: likedUris.length,
        playlistId: playlist.id,
      };
    },
    { auth: true }
  );
