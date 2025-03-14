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
import { delay, ensureDirectoryExists, fileExists, runCommand } from '../utils.js';
import path from 'path';
import axios from 'axios';
import { jsonResponse, createError } from '../lib/response.js';

export async function handleSpotifyScrape(ctx, send) {
  try {
    const genres = ['indie+rock', 'pop', 'rock', 'electronica', 'hip+hop'];
    const excludedTags = ['trance', 'metal', 'dubstep'];

    send({ message: `👤 Admin ${ctx.user.username} a lancé un scraping.` });

    const scrapedTracks = await scrapeTracksForGenres(genres, 1, excludedTags);
    const token = await getSpotifyAccessToken();
    const userPlaylists = await getAllUserPlaylists(token);

    for (const genre of genres) {
      const tracks = scrapedTracks[genre] || [];
      const uris = [];

      for (const track of tracks) {
        const uri = await searchTrackOnSpotify(track.artist, track.title, token);
        if (uri) uris.push(uri);
        await delay(500);
      }

      const name = `OurMusic - ${genre}`;
      let playlist = userPlaylists.find(p => p.name?.toLowerCase() === name.toLowerCase());

      if (!playlist) {
        const res = await axios.post(
          `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USER_ID}/playlists`,
          { name, description: `Auto playlist pour ${genre}`, public: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        playlist = res.data;
        send({ message: `✅ Playlist créée : ${name}` });
      } else {
        send({ message: `ℹ Playlist existante : ${name}` });
      }

      await addTracksIfNotExist(playlist, uris, token, send);
      await trimPlaylist(playlist, token, send);
      await delay(2000);
    }

    send({ message: '✅ Scraping terminé.' });
  } catch (err) {
    console.error('[handleSpotifyScrape Error]', err);
    send({ error: 'Erreur serveur pendant le scraping Spotify' });
  }
}

export async function handleSpotifySyncAll(ctx, send) {
  try {
    send({ message: `🔁 Admin ${ctx.user.username} a lancé une synchronisation globale.` });

    await createCookieFile(send);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      send({ message: '❌ Aucune playlist OurMusic trouvée.' });
      return;
    }

    for (const playlist of playlists) {
      await syncSinglePlaylist(playlist, token, send);
      await delay(5000);
    }

    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
    send({ message: '✅ Sync global terminé.' });
  } catch (err) {
    console.error('[handleSpotifySyncAll Error]', err);
    send({ error: 'Erreur serveur pendant la synchronisation globale' });
  }
}

export async function handleSpotifySyncById(ctx, send, playlistId) {
  try {
    send({ message: `🔁 Sync de la playlist ${playlistId} par ${ctx.user.username}` });

    await createCookieFile(send);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlist = (await getAllUserPlaylists(token)).find(p => p.id === playlistId);

    if (!playlist) {
      send({ error: 'Playlist introuvable.' });
      return;
    }

    await syncSinglePlaylist(playlist, token, send);
    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);

    send({ message: `✅ Sync terminée : ${playlist.name}` });
  } catch (err) {
    console.error('[handleSpotifySyncById Error]', err);
    send({ error: 'Erreur serveur pendant la sync playlist' });
  }
}

// 🔄 Fonction de synchronisation unique
async function syncSinglePlaylist(playlist, token, send) {
  try {
    const dir = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const syncFile = path.join(dir, `${safeName}.sync.spotdl`);

    if (await fileExists(syncFile)) {
      send({ message: `➡ Sync existant pour ${playlist.name}` });
      await syncPlaylistFile(syncFile, dir, send);
    } else {
      send({ message: `📂 Création du fichier de sync pour ${playlist.name}` });
      await createSyncFile(playlist, dir, send);
      await syncPlaylistFile(syncFile, dir, send);
    }
  } catch (err) {
    console.error(`[syncSinglePlaylist Error for ${playlist.name}]`, err);
    send({ error: `Erreur pendant le traitement de la playlist ${playlist.name}` });
  }
}

// ➕ Ajout de morceaux absents
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
    }
  } catch (err) {
    console.error('[addTracksIfNotExist Error]', err);
    send({ error: `Erreur lors de l'ajout de morceaux à ${playlist.name}` });
  }
}
