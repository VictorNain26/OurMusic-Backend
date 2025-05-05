// src/routes/spotify-sync.routes.js
import { Elysia } from 'elysia';
import { auth } from '../lib/auth/index.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';
import { getAllUserPlaylists } from '../spotify.js';
import { getFreshSpotifyAccessToken } from '../services/spotifyTokenHelper.js';
import { searchTrackOnSpotify } from '../spotify.js';

/* ───────────────── util ───────────────── */
function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

const PLAYLIST_CANON = 'ourmusic-morceaux-aimes';

function canon(str = '') {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[-‐‑–—]/g, '-')
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/-/g, '-');
}

export const spotifySyncRoutes = new Elysia({ prefix: '/api/spotify' })
  /* ─── auth macro ─── */
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const sess = await auth.api.getSession({ headers });
        if (!sess) return error(401);
        return { user: sess.user, session: sess.session };
      },
    },
  })

  /* ─── endpoint ─── */
  .post(
    '/sync-liked',
    async ({ user }) => {
      console.log(`🎧 [SYNC‑LIKED] user=${user.id}`);

      /* 1. tracks aimés */
      const likedTracks = await db
        .select()
        .from(schema.likedTracks)
        .where(eq(schema.likedTracks.userId, user.id));

      if (!likedTracks.length) {
        return { status: 400, error: 'Aucun morceau liké.' };
      }
      console.log(`→ ${likedTracks.length} track(s) liké(s)`);

      /* --- compte Spotify du user --- */
      const spotifyAccount = await db.query.account.findFirst({
        where: and(eq(schema.account.userId, user.id), eq(schema.account.providerId, 'spotify')),
      });

      if (!spotifyAccount) {
        return { status: 400, error: 'Aucun compte Spotify lié.' };
      }

      const token = await getFreshSpotifyAccessToken(spotifyAccount);
      const spotifyOwnerId = spotifyAccount.accountId;
      console.log('→ access token OK');

      /* 3. convertir en URI Spotify */
      const likedUris = [];
      for (const t of likedTracks) {
        const uri = await searchTrackOnSpotify(t.artist, t.title, token);
        if (uri) likedUris.push(uri);
      }
      if (!likedUris.length) {
        return { status: 500, error: 'Aucune correspondance trouvée sur Spotify.' };
      }
      console.log(`→ ${likedUris.length} URI trouvées`);

      /* 4. récupérer / créer playlist */
      const allPlaylists = await getAllUserPlaylists(token);

      let playlist = allPlaylists.find(
        p => canon(p.name) === PLAYLIST_CANON && p.owner?.id === spotifyOwnerId
      );
      if (!playlist) {
        const { data } = await axios.post(
          'https://api.spotify.com/v1/me/playlists',
          {
            name: 'OurMusic - Morceaux Aimés',
            public: false,
            description: 'Synchronisation automatique depuis OurMusic',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        playlist = data;
        console.log(`→ playlist créée (${playlist.id})`);
      } else {
        console.log(`→ playlist trouvée (${playlist.id})`);
      }

      /* 5. lire contenu actuel */
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
      console.log(`→ diff = +${toAdd.length} / -${toRemove.length}`);

      /* 7. appliquer */
      if (toRemove.length) {
        for (const chunk of chunkArray(toRemove, 100)) {
          await axios.delete(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { tracks: chunk.map(uri => ({ uri })) },
          });
        }
      }

      if (toAdd.length) {
        for (const chunk of chunkArray(toAdd, 100)) {
          await axios.post(
            `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
            { uris: chunk },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      console.log('→ synchronisation terminée');
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
