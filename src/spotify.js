import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { runCommand, ensureDirectoryExists } from './utils/fileUtils.js';
import { spotifyRequestWithRetry } from './utils/spotifyApi.js';
import { pRateLimit } from 'p-ratelimit';

export const spotifyLimiter = pRateLimit({
  interval: 1000,
  rate: 10,
  concurrency: 1,
  maxDelay: 5000,
});

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

  const response = await spotifyLimiter(() =>
    axios.post('https://accounts.spotify.com/api/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  );

  cachedToken = response.data.access_token;
  tokenExpiry = now + (response.data.expires_in - 60) * 1000;
  return cachedToken;
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
    const output = await spotifyLimiter(() => runCommand(cmd));
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
  let needToRegenerate = false;

  try {
    const fileStats = await fs.stat(COOKIE_FILE);
    const age = Date.now() - fileStats.mtimeMs;
    if (age >= cookieAgeLimit) {
      needToRegenerate = true;
      sendEvent({ message: '⌛ Cookie existant trop vieux (> 24h), régénération nécessaire.' });
    } else {
      sendEvent({ message: '✅ Cookie existant récent (< 24h), vérification de sa validité...' });
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      needToRegenerate = true;
      sendEvent({ message: '❌ Aucun cookie trouvé, création nécessaire.' });
    } else {
      sendEvent({ error: `Erreur lors de la vérification du cookie : ${error.message}` });
      throw error;
    }
  }

  if (!needToRegenerate) {
    try {
      const checkCmd = [
        'yt-dlp',
        '--cookies',
        COOKIE_FILE,
        '--skip-download',
        '--quiet',
        '--no-warnings',
        'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      ];
      const output = await runCommand(checkCmd);

      if (output.includes('Sign in to confirm') || output.toLowerCase().includes('sign in to')) {
        needToRegenerate = true;
        sendEvent({ message: '⚠️ Cookie existant invalide, régénération nécessaire.' });
      } else {
        sendEvent({ message: '✅ Cookie existant validé.' });
      }
    } catch {
      needToRegenerate = true;
      sendEvent({ message: '⚠️ Erreur lors du test du cookie existant, régénération nécessaire.' });
    }
  }

  if (needToRegenerate) {
    const cookiesFromBrowserArg = `firefox:${FIREFOX_FOLDER}/${FIREFOX_PROFILE}`;
    const cmd = [
      'yt-dlp',
      '--cookies-from-browser',
      cookiesFromBrowserArg,
      '--cookies',
      COOKIE_FILE,
      '--skip-download',
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    ];

    try {
      const output = await runCommand(cmd);

      if (output.includes('Sign in to confirm') || output.toLowerCase().includes('sign in to')) {
        sendEvent({
          error: '🛑 Impossible de générer un cookie valide. Vérifie ton profil Firefox.',
        });
        throw new Error('🛑 Cookie Firefox invalide. Connecte-toi à YouTube puis régénère.');
      }

      sendEvent({ message: `✅ Nouveau cookie généré avec succès.` });
    } catch (err) {
      sendEvent({ error: `Erreur lors de la régénération du cookie : ${err.message}` });
      throw err;
    }
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

export async function getDurationFromSpotifyTrackUri(uri, token) {
  const trackId = uri.split(':').pop();

  try {
    const response = await spotifyLimiter(() =>
      axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    return response.data.duration_ms;
  } catch (err) {
    console.warn(`⚠️ Erreur durée (track ${trackId}) :`, err.message);
    return null;
  }
}

export async function trimPlaylist(playlist, token, sendEvent) {
  const tracks = await getAllPlaylistTracks(playlist.id, token);
  if (tracks.length <= 50) {
    sendEvent({
      message: `La playlist "${playlist.name}" contient ${tracks.length} morceaux (pas de suppression nécessaire).`,
    });
  }

  const tracksWithIndex = tracks.map((item, index) => ({
    index,
    added_at: item.added_at,
    uri: item.track.uri,
  }));

  // ✅ Suppression des morceaux trop longs
  for (const track of tracksWithIndex) {
    const durationMs = await getDurationFromSpotifyTrackUri(track.uri, token);
    if (!durationMs) continue;

    if (durationMs > 6 * 60 * 1000) {
      sendEvent({ message: `🧹 Suppression (durée >6min) : ${track.uri}` });
      try {
        await spotifyRequestWithRetry(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          token,
          'DELETE',
          {
            tracks: [{ uri: track.uri }],
          }
        );
        sendEvent({ message: `✅ Supprimé : ${track.uri}` });
      } catch (err) {
        sendEvent({
          error: `❌ Échec suppression ${track.uri} : ${err.message}`,
        });
      }
    }
  }

  // ✅ Suppression des plus anciens si > 50 morceaux
  if (tracksWithIndex.length > 50) {
    const numberToRemove = tracksWithIndex.length - 50;
    const oldestTracks = tracksWithIndex
      .sort((a, b) => new Date(a.added_at) - new Date(b.added_at))
      .slice(0, numberToRemove);

    sendEvent({
      message: `🚮 Suppression des ${numberToRemove} morceaux les plus anciens de "${playlist.name}"`,
    });

    for (const track of oldestTracks) {
      try {
        await spotifyRequestWithRetry(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          token,
          'DELETE',
          {
            tracks: [{ uri: track.uri }],
          }
        );
        sendEvent({ message: `✅ Supprimé : ${track.uri} (ancien)` });
      } catch (err) {
        sendEvent({
          error: `❌ Erreur suppression ancien : ${track.uri} → ${err.message}`,
        });
      }
    }
  }
}
