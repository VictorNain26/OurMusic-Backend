import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { runCommand, ensureDirectoryExists } from './utils/fileUtils.js';
import { spotifyRequestWithRetry } from './utils/spotifyApi.js';

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  SPOTIFY_REFRESH_TOKEN,
  PLAYLIST_PATH,
  COOKIE_FILE,
  FIREFOX_FOLDER,
  FIREFOX_PROFILE,
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error("Les variables d'environnement Spotify doivent être définies.");
}

if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error('Les variables PLAYLIST_PATH et COOKIE_FILE doivent être définies.');
}

let cachedToken = null;
let tokenExpiry = 0;

export async function getSpotifyAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const data = SPOTIFY_REFRESH_TOKEN
    ? new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: SPOTIFY_REFRESH_TOKEN,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      })
    : new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      });

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    cachedToken = response.data.access_token;
    tokenExpiry = now + (response.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (error) {
    throw new Error('Erreur récupération token Spotify: ' + error.message);
  }
}

export async function getOurMusicPlaylists(token) {
  const url = `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`;
  const response = await spotifyRequestWithRetry(url, token);
  if (!response.data.items) throw new Error('Structure inattendue des données de Spotify.');
  return response.data.items.filter(playlist => playlist.name.toLowerCase().includes('ourmusic'));
}

export async function getAllUserPlaylists(token) {
  let allPlaylists = [];
  let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
  while (url) {
    const response = await spotifyRequestWithRetry(url, token);
    allPlaylists = allPlaylists.concat(response.data.items);
    url = response.data.next;
  }
  return allPlaylists;
}

export async function createPlaylistDirectory(playlist) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const playlistDirPath = path.join(PLAYLIST_PATH, safeName);
  await ensureDirectoryExists(playlistDirPath);
  return playlistDirPath;
}

export async function createSyncFile(playlist, playlistDirPath, sendEvent) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);
  const cmd = [
    'spotdl',
    'sync',
    playlist.external_urls.spotify,
    '--save-file',
    syncFilePath,
    '--output',
    playlistDirPath,
    '--cookie-file',
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Fichier de synchronisation créé pour '${playlist.name}' : ${output}` });
  } catch (err) {
    sendEvent({
      error: `Erreur lors de la création du fichier de synchronisation pour '${playlist.name}' : ${err.message}`,
    });
    throw err;
  }
  return syncFilePath;
}

export async function syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent) {
  const cmd = [
    'spotdl',
    'sync',
    syncFilePath,
    '--output',
    playlistDirPath,
    '--cookie-file',
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Synchronisation réussie pour '${syncFilePath}' : ${output}` });
  } catch (err) {
    sendEvent({
      error: `Erreur lors de la synchronisation du fichier '${syncFilePath}' : ${err.message}`,
    });
    throw err;
  }
}

export async function createCookieFile(sendEvent) {
  const cookieAgeLimit = 24 * 60 * 60 * 1000;
  try {
    const fileStats = await fs.stat(COOKIE_FILE);
    const age = Date.now() - fileStats.mtimeMs;
    if (age < cookieAgeLimit) {
      sendEvent({ message: 'Le cookie est récent (< 24h), mise à jour non nécessaire.' });
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      sendEvent({ error: `Erreur lors de la vérification du cookie : ${error.message}` });
      throw error;
    }
  }

  const cookiesFromBrowserArg = `firefox:${FIREFOX_FOLDER}/${FIREFOX_PROFILE}`;
  const cmd = [
    'yt-dlp',
    '--cookies-from-browser',
    cookiesFromBrowserArg,
    '--cookies',
    COOKIE_FILE,
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    '--sleep-interval',
    '1',
    '--max-sleep-interval',
    '2',
    '--skip-download',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Cookie créé avec succès : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la création du cookie : ${err.message}` });
  }
}

export async function searchTrackOnSpotify(artist, title, token) {
  const query = encodeURIComponent(`track:${title} artist:${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
  try {
    const response = await spotifyRequestWithRetry(url, token);
    if (response.data.tracks.items.length > 0) {
      return response.data.tracks.items[0].uri;
    }
    return null;
  } catch (err) {
    console.error(`Erreur lors de la recherche de "${artist} - ${title}" :`, err.message);
    return null;
  }
}

export async function getAllPlaylistTracks(playlistId, token) {
  let tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(added_at,track(uri))&limit=100`;
  while (url) {
    const response = await spotifyRequestWithRetry(url, token);
    tracks = tracks.concat(response.data.items);
    url = response.data.next;
  }
  return tracks;
}

export async function trimPlaylist(playlist, token, sendEvent) {
  const tracks = await getAllPlaylistTracks(playlist.id, token);
  if (tracks.length <= 50) {
    sendEvent({
      message: `La playlist "${playlist.name}" contient ${tracks.length} morceaux (pas de suppression nécessaire).`,
    });
    return;
  }

  const tracksWithIndex = tracks.map((item, index) => ({
    index,
    added_at: item.added_at,
    uri: item.track.uri,
  }));
  tracksWithIndex.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
  const numberToRemove = tracks.length - 50;
  const tracksToRemove = tracksWithIndex.slice(0, numberToRemove);
  sendEvent({
    message: `Suppression de ${numberToRemove} morceaux les plus anciens dans la playlist "${playlist.name}".`,
  });

  for (const track of tracksToRemove) {
    try {
      await spotifyRequestWithRetry(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        token,
        'DELETE',
        {
          tracks: [{ uri: track.uri, positions: [track.index] }],
        }
      );
      sendEvent({ message: `Supprimé : ${track.uri} (position ${track.index})` });
    } catch (err) {
      sendEvent({
        error: `Erreur lors de la suppression du morceau ${track.uri} : ${err.message}`,
      });
    }
  }
}
