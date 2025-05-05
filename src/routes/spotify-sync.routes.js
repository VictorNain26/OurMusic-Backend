import { Elysia } from 'elysia';
import { auth } from '../lib/auth/index.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { spotifyRequestWithRetry } from '../utils/spotifyApi.js';
import { getFreshSpotifyAccessToken } from '../services/spotifyTokenHelper.js';
import { searchTrackOnSpotify } from '../spotify.js';

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export const spotifySyncRoutes = new Elysia({ prefix: '/api/spotify' })
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return error(401);
        return { user: session.user, session: session.session };
      },
    },
  })

  .post(
    '/sync-liked',
    async ({ user }) => {
      const likedTracks = await db
        .select()
        .from(schema.likedTracks)
        .where(eq(schema.likedTracks.userId, user.id));

      const spotifyAccount = await db.query.account.findFirst({
        where: eq(schema.account.userId, user.id),
      });

      if (!spotifyAccount || spotifyAccount.providerId !== 'spotify') {
        return { status: 400, error: 'Compte Spotify non lié' };
      }

      const token = await getFreshSpotifyAccessToken(spotifyAccount);

      // Étape 1 : recherche des URI Spotify des morceaux likés
      const likedUris = [];
      for (const track of likedTracks) {
        const uri = await searchTrackOnSpotify(track.artist, track.title, token);
        if (uri) likedUris.push(uri);
      }

      // Étape 2 : chercher ou créer la playlist
      const playlists = await spotifyRequestWithRetry(
        `https://api.spotify.com/v1/me/playlists?limit=50`,
        token
      );
      let playlist = playlists.data.items.find(p =>
        p.name.toLowerCase().includes('ourmusic - morceaux aimés')
      );

      if (!playlist) {
        const res = await axios.post(
          'https://api.spotify.com/v1/me/playlists',
          {
            name: 'OurMusic - Morceaux Aimés',
            public: false,
            description: 'Synchronisation automatique depuis OurMusic',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        playlist = res.data;
      }

      // Étape 3 : récupérer tous les morceaux actuels de la playlist
      const existingUris = [];
      let url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri)),next&limit=100`;
      while (url) {
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        res.data.items.forEach(item => {
          if (item.track?.uri) existingUris.push(item.track.uri);
        });
        url = res.data.next;
      }

      // Étape 4 : calcul des ajouts et suppressions
      const urisToAdd = likedUris.filter(uri => !existingUris.includes(uri));
      const urisToRemove = existingUris.filter(uri => !likedUris.includes(uri));

      // Suppression
      if (urisToRemove.length > 0) {
        const chunks = chunkArray(urisToRemove, 100);
        for (const chunk of chunks) {
          await axios.request({
            method: 'DELETE',
            url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
            headers: { Authorization: `Bearer ${token}` },
            data: { tracks: chunk.map(uri => ({ uri })) },
          });
        }
      }

      // Ajout
      if (urisToAdd.length > 0) {
        const chunks = chunkArray(urisToAdd, 100);
        for (const chunk of chunks) {
          await axios.post(
            `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
            { uris: chunk },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      return {
        message: `✅ Synchronisation complète terminée`,
        added: urisToAdd.length,
        removed: urisToRemove.length,
        total: likedUris.length,
        playlistId: playlist.id,
      };
    },
    { auth: true }
  );
