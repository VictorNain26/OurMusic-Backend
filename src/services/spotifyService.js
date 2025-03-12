import { verifyAdmin } from '../middlewares/auth.js';
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
import { delay, ensureDirectoryExists, fileExists, runCommand } from '../utils/helpers.js';
import path from 'path';
import axios from 'axios';

export async function spotifyScrape(req, sendEvent) {
  await verifyAdmin(req);
  const genres = ['indie+rock', 'pop', 'rock', 'electronica', 'hip+hop'];
  const excludedTags = ['trance', 'metal', 'dubstep'];
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
      sendEvent({ message: `Playlist créée : ${name}` });
    } else {
      sendEvent({ message: `Playlist existante : ${name}` });
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
      sendEvent({ message: `${newUris.length} titres ajoutés à ${name}` });
    }

    await trimPlaylist(playlist, token, sendEvent);
    await delay(2000);
  }
  sendEvent({ message: '✅ Scraping terminé.' });
}

export async function spotifySyncAll(req, sendEvent) {
  await verifyAdmin(req);
  sendEvent({ message: '🔁 Sync global démarré' });
  await createCookieFile(sendEvent);
  await ensureDirectoryExists('/root/.spotdl/temp');

  const token = await getSpotifyAccessToken();
  const playlists = await getOurMusicPlaylists(token);
  if (!playlists.length) return sendEvent({ message: '❌ Aucune playlist ourmusic trouvée.' });

  for (const playlist of playlists) {
    await handlePlaylistSync(playlist, token, sendEvent);
    await delay(5000);
  }
  await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
  sendEvent({ message: '✅ Sync global terminé.' });
}

export async function spotifySyncById(req, sendEvent, playlistId) {
  await verifyAdmin(req);
  sendEvent({ message: `Sync playlist ${playlistId}` });
  await createCookieFile(sendEvent);
  await ensureDirectoryExists('/root/.spotdl/temp');
  const token = await getSpotifyAccessToken();
  const playlist = (await getAllUserPlaylists(token)).find(p => p.id === playlistId);
  if (!playlist) return sendEvent({ error: 'Playlist introuvable.' });
  await handlePlaylistSync(playlist, token, sendEvent);
  await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
  sendEvent({ message: `✅ Sync ${playlist.name} terminée.` });
}

async function handlePlaylistSync(playlist, token, sendEvent) {
  const dir = await createPlaylistDirectory(playlist);
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const syncFile = path.join(dir, `${safeName}.sync.spotdl`);
  if (await fileExists(syncFile)) {
    sendEvent({ message: `Sync existant pour ${playlist.name}` });
    await syncPlaylistFile(syncFile, dir, sendEvent);
  } else {
    sendEvent({ message: `Création sync pour ${playlist.name}` });
    await createSyncFile(playlist, dir, sendEvent);
    await syncPlaylistFile(syncFile, dir, sendEvent);
  }
}
