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
import fs from 'fs/promises';
import axios from 'axios';

const {
  SPOTDL_FORMAT = 'mp3',
  SPOTDL_BITRATE = '192k',
  SPOTDL_THREADS = '4',
  SPOTDL_FFMPEG_PATH = 'ffmpeg',
  SPOTDL_USE_USER_AUTH = 'false',
  PLAYLIST_PATH,
} = Bun.env;

// ✅ Vérifie que spotDL est installé
export async function checkSpotdlInstalled() {
  return await runCommand(['spotdl', '--version']);
}

// ✅ Nettoyage automatique des fichiers inutiles (.temp, .spotdl)
export async function cleanupSpotdlFiles(sendEvent) {
  const allDirs = await fs.readdir(PLAYLIST_PATH);
  for (const dir of allDirs) {
    const fullPath = path.join(PLAYLIST_PATH, dir);
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(fullPath);
    for (const file of files) {
      if (file.endsWith('.temp') || file.endsWith('.spotdl')) {
        const filePath = path.join(fullPath, file);
        await fs.unlink(filePath);
        sendEvent({ message: `🗑️ Fichier supprimé : ${filePath}` });
      }
    }
  }

  sendEvent({ message: `✅ Nettoyage terminé.` });
}

// ✅ Scraping HypeMachine + ajout brut sur Spotify
export async function handleSpotifyScrape(user, send) {
  const genres = ['indie+rock', 'pop', 'electronica', 'electronic', 'hip+hop', 'rock', 'classical'];
  const excludedTags = [
    'trance',
    'metal',
    'dubstep',
    'screamo',
    'dance',
    'easy+listening',
    'heavy+metal',
  ];

  send({ message: `👤 Admin a lancé un scraping.` });

  try {
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

        await delay(500);
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
    send({ error: err.message || 'Erreur pendant le scraping Spotify' });
    throw err;
  }
}

// ✅ Synchronisation de toutes les playlists
export async function handleSpotifySyncAll(user, send) {
  send({ message: `🔁 Admin a lancé une synchronisation globale.` });

  try {
    send({ message: '🔎 Étape 1 : Création ou validation du cookie...' });
    await createCookieFile(send);

    send({ message: '📂 Étape 2 : Vérification du dossier de travail...' });
    await ensureDirectoryExists('/root/.spotdl/temp');

    send({ message: '🔑 Étape 3 : Récupération du token Spotify...' });
    const token = await getSpotifyAccessToken();

    send({ message: '📋 Étape 4 : Récupération des playlists OurMusic...' });
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      send({ message: '❌ Aucune playlist OurMusic trouvée.' });
      return;
    }

    send({ message: `🎵 ${playlists.length} playlists à synchroniser.` });

    for (const playlist of playlists) {
      send({ message: `🎶 Synchronisation de la playlist : ${playlist.name}` });

      try {
        await syncSinglePlaylist(playlist, token, send);
        send({ message: `✅ Playlist synchronisée : ${playlist.name}` });
      } catch (err) {
        send({ error: `❌ Erreur sur ${playlist.name} : ${err.message}` });
      }

      send({ message: '🕒 Pause de 10 minutes avant la prochaine playlist...' });
      await delay(10 * 60 * 1000);
    }

    send({ message: '🔧 Étape finale : permissions sur les fichiers...' });
    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);

    send({ message: '🏁 ✅ Synchronisation globale terminée avec succès.' });
  } catch (err) {
    console.error('[handleSpotifySyncAll Error]', err);
    send({ error: err.message || 'Erreur pendant la synchronisation globale' });
    throw err;
  }
}

// ✅ Synchronisation d’une playlist spécifique par ID
export async function handleSpotifySyncById(user, send, playlistId) {
  send({ message: `🔁 Sync de la playlist ${playlistId}` });

  try {
    await createCookieFile(send);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) {
      send({ error: 'Playlist introuvable.' });
      throw new Error('Playlist introuvable.');
    }

    send({ message: `▶ Synchronisation de ${playlist.name}` });
    await syncSinglePlaylist(playlist, token, send);

    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
    send({ message: `✅ Sync terminée : ${playlist.name}` });
  } catch (err) {
    console.error('[handleSpotifySyncById Error]', err);
    send({ error: err.message || 'Erreur pendant la synchronisation' });
    throw err;
  }
}

// 🔁 Sync d’une seule playlist (utilitaire interne)
async function syncSinglePlaylist(playlist, token, send) {
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
}

// ➕ Ajoute les morceaux manquants à la playlist
async function addTracksIfNotExist(playlist, uris, token, send) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri))&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const existingUris = response.data.items.map(i => i.track.uri);
    const newUris = uris.filter(uri => !existingUris.includes(uri));

    if (newUris.length) {
      for (let i = 0; i < newUris.length; i += 50) {
        const chunk = newUris.slice(i, i + 50);
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          { uris: chunk },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        send({ message: `🎶 ${chunk.length} titres ajoutés à ${playlist.name}` });
        await delay(2000);
      }
    } else {
      send({ message: `✅ Aucun nouveau titre à ajouter dans ${playlist.name}` });
    }
  } catch (err) {
    console.error('[addTracksIfNotExist Error]', err);
    send({ error: `Erreur ajout morceaux à ${playlist.name}` });
    throw err;
  }
}
