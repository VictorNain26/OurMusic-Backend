// src/services/spotifyService.js
import { getSpotifyPlaylists, getSpotifyTracks } from '../lib/spotify';
import { upsertTrack, saveTrackToPlaylist } from '../db/queries/track';
import { searchYoutubeTrack } from '../lib/youtube';
import { wait } from '../utils/wait';

const MAX_RETRIES = 3;

export const spotifyService = {
  async syncAllPlaylists(send, userId) {
    send({ message: '📡 Récupération des playlists Spotify...' });

    const playlists = await getSpotifyPlaylists(userId);
    if (!playlists.length) {
      send({ message: '⚠️ Aucune playlist trouvée.' });
      return;
    }

    for (const playlist of playlists) {
      send({ message: `▶️ Playlist : ${playlist.name}` });
      await this.syncSinglePlaylist(send, playlist.id, userId);
    }

    send({ message: '✅ Synchronisation globale terminée.' });
  },

  async syncSinglePlaylist(send, playlistId, userId) {
    send({ message: `📥 Synchronisation playlist ID : ${playlistId}` });

    const tracks = await getSpotifyTracks(playlistId, userId);

    if (!tracks || tracks.length === 0) {
      send({ message: '❌ Aucune piste trouvée dans cette playlist.' });
      return;
    }

    for (const track of tracks) {
      const { title, artist } = track;
      const name = `${artist} - ${title}`;
      send({ message: `🔎 Recherche : ${name}` });

      let attempt = 0;
      let success = false;

      while (attempt < MAX_RETRIES && !success) {
        try {
          const youtubeUrl = await searchYoutubeTrack(title, artist, attempt);
          const saved = await upsertTrack({ title, artist, youtubeUrl });
          await saveTrackToPlaylist(saved.id, playlistId, userId);

          send({ message: `✅ ${name} ajouté.` });
          success = true;
        } catch (err) {
          attempt++;
          console.warn(`[${name}] Tentative ${attempt} échouée:`, err.message);

          if (attempt >= MAX_RETRIES) {
            send({ message: `⚠️ ${name} ignoré après ${MAX_RETRIES} essais.` });
          } else {
            send({ message: `⏳ Nouvelle tentative pour ${name}...` });
            await wait(2000 * attempt); // backoff progressif
          }
        }
      }
    }

    send({ message: `✅ Playlist ${playlistId} synchronisée.` });
  },

  async scrapeAllPlaylists(send, userId) {
    send({ message: '🕷️ Lancement du scraping Spotify...' });

    const playlists = await getSpotifyPlaylists(userId);

    for (const playlist of playlists) {
      send({ message: `🔍 Scrap playlist : ${playlist.name}` });
      // Possibilité future d'ajouter des métadonnées, covers, etc.
    }

    send({ message: '🎉 Scrap terminé.' });
  },
};
