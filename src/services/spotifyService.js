import {
  getSpotifyAccessToken,
  getOurMusicPlaylists,
  getAllUserPlaylists,
  createPlaylistDirectory,
  createSyncFile,
  syncPlaylistFile,
  createCookieFile,
  searchTrackOnSpotify,
  trimPlaylist,
} from '../spotify.js';

import { scrapeTracksForGenres } from '../scraper.js';
import { delay, ensureDirectoryExists, fileExists, runCommand } from '../utils/fileUtils.js';
import path from 'path';
import axios from 'axios';

// ✅ Handle scraping des genres Spotify + création playlists
export async function handleSpotifyScrape(send) {
  try {
    const genres = ['indie+rock', 'pop', 'rock', 'electronica', 'hip+hop'];
    const excludedTags = ['trance', 'metal', 'dubstep'];

    send({ message: `👤 Admin a lancé un scraping.` });

    const scrapedTracks = await scrapeTracksForGenres(genres, 1, excludedTags);
    const token = await getSpotifyAccessToken();
    const userPlaylists = await getAllUserPlaylists(token);

    for (const genre of genres) {
      const tracks = scrapedTracks[genre] || [];
      send({ message: `📦 ${tracks.length} morceaux scrappés pour ${genre}` });

      const uris = [];

      for (const track of tracks) {
        if (!track?.artist || !track?.title) continue;

        const uri = await searchTrackOnSpotify(track.artist, track.title, token);
        if (uri) {
          uris.push(uri);
          send({ message: `🔗 Trouvé : ${track.artist} - ${track.title}` });
        } else {
          send({ message: `❌ Introuvable sur Spotify : ${track.artist} - ${track.title}` });
        }

        await delay(300); // 👌 On garde un délai pour éviter le rate-limit
      }

      send({
        message: `🎯 ${uris.length}/${tracks.length} morceaux trouvés sur Spotify pour ${genre}`,
      });

      const playlistName = `OurMusic - ${genre}`;
      let playlist = userPlaylists.find(p => p.name?.toLowerCase() === playlistName.toLowerCase());

      if (!playlist) {
        const res = await axios.post(
          `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USER_ID}/playlists`,
          {
            name: playlistName,
            description: `Auto playlist pour ${genre}`,
            public: true,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        playlist = res.data;
        send({ message: `✅ Playlist créée : ${playlistName}` });
      } else {
        send({ message: `ℹ️ Playlist existante : ${playlistName}` });
      }

      await addTracksIfNotExist(playlist, uris, token, send);
      await trimPlaylist(playlist, token, send);

      send({ message: `✅ Traitement terminé pour ${playlistName}` });

      await delay(1000);
    }

    send({ message: '🏁 Scraping complet terminé pour tous les genres.' });
  } catch (err) {
    console.error('[handleSpotifyScrape Error]', err);
    send({ error: 'Erreur serveur pendant le scraping Spotify' });
  }
}

// ✅ Handle synchronisation globale
export async function handleSpotifySyncAll(send) {
  try {
    send({ message: `🔁 Admin a lancé une synchronisation globale.` });

    await createCookieFile(send);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      send({ message: '❌ Aucune playlist OurMusic trouvée.' });
      return;
    }

    for (const playlist of playlists) {
      send({ message: `▶ Synchronisation de ${playlist.name}` });
      await syncSinglePlaylist(playlist, token, send);
      await delay(5000);
    }

    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
    send({ message: '✅ Synchronisation globale terminée.' });
  } catch (err) {
    console.error('[handleSpotifySyncAll Error]', err);
    send({ error: 'Erreur serveur pendant la synchronisation globale.' });
  }
}

// ✅ Handle synchronisation par playlist ID
export async function handleSpotifySyncById(send, playlistId) {
  try {
    send({ message: `🔁 Sync de la playlist ${playlistId}` });

    await createCookieFile(send);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) {
      send({ error: 'Playlist introuvable.' });
      return;
    }

    send({ message: `▶ Synchronisation de ${playlist.name}` });
    await syncSinglePlaylist(playlist, token, send);

    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
    send({ message: `✅ Sync terminée : ${playlist.name}` });
  } catch (err) {
    console.error('[handleSpotifySyncById Error]', err);
    send({ error: 'Erreur serveur pendant la synchronisation de la playlist' });
  }
}

// ✅ Utilitaire : Sync d'une playlist unique
async function syncSinglePlaylist(playlist, token, send) {
  try {
    const playlistDirPath = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const syncFile = path.join(playlistDirPath, `${safeName}.sync.spotdl`);

    if (await fileExists(syncFile)) {
      send({ message: `➡️ Fichier de sync trouvé : ${syncFile}` });
      await syncPlaylistFile(syncFile, playlistDirPath, send);
    } else {
      send({ message: `📂 Création du fichier de sync : ${syncFile}` });
      await createSyncFile(playlist, playlistDirPath, send);
      await syncPlaylistFile(syncFile, playlistDirPath, send);
    }
  } catch (err) {
    console.error(`[syncSinglePlaylist Error for ${playlist.name}]`, err);
    send({ error: `Erreur pendant le traitement de la playlist ${playlist.name}` });
  }
}

// ✅ Utilitaire : Ajout des nouveaux morceaux à la playlist
async function addTracksIfNotExist(playlist, uris, token, send) {
  try {
    const existingUris = (
      await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri))&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    ).data.items.map(i => i.track.uri);

    const newUris = uris.filter(uri => !existingUris.includes(uri));

    if (newUris.length) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        { uris: newUris },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      send({ message: `🎶 ${newUris.length} titres ajoutés à ${playlist.name}` });
    } else {
      send({ message: `✅ Aucun nouveau titre à ajouter dans ${playlist.name}` });
    }
  } catch (err) {
    console.error('[addTracksIfNotExist Error]', err);
    send({ error: `Erreur lors de l'ajout de morceaux à ${playlist.name}` });
  }
}
