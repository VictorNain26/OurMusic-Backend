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

export async function spotifyScrape(ctx, sendEvent) {
  try {
    const genres = ['indie+rock', 'pop', 'rock', 'electronica', 'hip+hop'];
    const excludedTags = ['trance', 'metal', 'dubstep'];

    sendEvent({ message: `👤 Admin ${ctx.user.username} a lancé un scraping.` });

    const data = await scrapeTracksForGenres(genres, 1, excludedTags);
    const token = await getSpotifyAccessToken();
    const userPlaylists = await getAllUserPlaylists(token);

    for (const genre of genres) {
      const tracks = data[genre] || [];
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
        sendEvent({ message: `✅ Playlist créée : ${name}` });
      } else {
        sendEvent({ message: `ℹ Playlist existante : ${name}` });
      }

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
        sendEvent({ message: `🎶 ${newUris.length} titres ajoutés à ${name}` });
      }

      await trimPlaylist(playlist, token, sendEvent);
      await delay(2000);
    }

    sendEvent({ message: '✅ Scraping terminé.' });
  } catch (err) {
    console.error('[spotifyScrape Error]', err);
    sendEvent({ error: 'Erreur serveur pendant le scraping Spotify' });
  }
}

export async function spotifySyncAll(ctx, sendEvent) {
  try {
    sendEvent({ message: `🔁 Admin ${ctx.user.username} a lancé une synchronisation globale.` });

    await createCookieFile(sendEvent);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      sendEvent({ message: '❌ Aucune playlist OurMusic trouvée.' });
      return;
    }

    for (const playlist of playlists) {
      await handlePlaylistSync(playlist, token, sendEvent);
      await delay(5000);
    }

    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
    sendEvent({ message: '✅ Sync global terminé.' });
  } catch (err) {
    console.error('[spotifySyncAll Error]', err);
    sendEvent({ error: 'Erreur serveur pendant la synchronisation globale' });
  }
}

export async function spotifySyncById(ctx, sendEvent, playlistId) {
  try {
    sendEvent({
      message: `🔁 Admin ${ctx.user.username} a lancé une synchronisation de la playlist ${playlistId}`,
    });

    await createCookieFile(sendEvent);
    await ensureDirectoryExists('/root/.spotdl/temp');

    const token = await getSpotifyAccessToken();
    const playlist = (await getAllUserPlaylists(token)).find(p => p.id === playlistId);

    if (!playlist) {
      sendEvent({ error: 'Playlist introuvable.' });
      return;
    }

    await handlePlaylistSync(playlist, token, sendEvent);
    await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);

    sendEvent({ message: `✅ Sync terminée : ${playlist.name}` });
  } catch (err) {
    console.error('[spotifySyncById Error]', err);
    sendEvent({ error: 'Erreur serveur pendant la sync playlist' });
  }
}

async function handlePlaylistSync(playlist, token, sendEvent) {
  try {
    const dir = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const syncFile = path.join(dir, `${safeName}.sync.spotdl`);

    if (await fileExists(syncFile)) {
      sendEvent({ message: `➡ Sync existant pour ${playlist.name}` });
      await syncPlaylistFile(syncFile, dir, sendEvent);
    } else {
      sendEvent({ message: `📂 Création du fichier de sync pour ${playlist.name}` });
      await createSyncFile(playlist, dir, sendEvent);
      await syncPlaylistFile(syncFile, dir, sendEvent);
    }
  } catch (err) {
    console.error(`[handlePlaylistSync Error for ${playlist.name}]`, err);
    sendEvent({ error: `Erreur pendant le traitement de la playlist ${playlist.name}` });
  }
}
