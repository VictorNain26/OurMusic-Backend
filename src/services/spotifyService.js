import { verifyAdmin } from '../middlewares/verifyAdmin.js';
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
import axios from 'axios';
import path from 'path';

export async function spotifyScrape(req, sendEvent) {
  await verifyAdmin(req);
  const genres = ['indie+rock', 'pop', 'rock', 'electronica', 'hip+hop'];
  const excludedTags = ['trance', 'metal', 'dubstep', 'death+metal', 'acid'];
  const scrapedData = await scrapeTracksForGenres(genres, 1, excludedTags);
  const token = await getSpotifyAccessToken();
  const userPlaylists = await getAllUserPlaylists(token);

  for (const genre of genres) {
    const tracks = scrapedData[genre] || [];
    const trackUris = [];

    for (const track of tracks) {
      const uri = await searchTrackOnSpotify(track.artist, track.title, token);
      if (uri) trackUris.push(uri);
      await delay(500);
    }

    const name = `OurMusic - ${genre}`.toLowerCase();
    let playlist = userPlaylists.find(p => p.name?.toLowerCase() === name);

    if (!playlist) {
      const res = await axios.post(
        `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USER_ID}/playlists`,
        {
          name: `OurMusic - ${genre}`,
          description: `Playlist générée pour ${genre}`,
          public: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      playlist = res.data;
      userPlaylists.push(playlist);
      sendEvent({ message: `Playlist créée : ${playlist.name}` });
    } else {
      sendEvent({ message: `Utilisation de la playlist existante : ${playlist.name}` });
    }

    const existingUris = (
      await axios.get(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri))&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    ).data.items.map(i => i.track.uri);
    const newUris = trackUris.filter(uri => !existingUris.includes(uri));

    if (newUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        { uris: newUris },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      sendEvent({ message: `Ajout de ${newUris.length} morceaux à ${playlist.name}` });
    } else {
      sendEvent({ message: `Aucun nouveau morceau à ajouter à ${playlist.name}` });
    }

    await trimPlaylist(playlist, token, sendEvent);
    await delay(2000);
  }
  sendEvent({ message: 'Scraping terminé.' });
}

export async function spotifySyncAll(req, sendEvent) {
  await verifyAdmin(req);
  sendEvent({ message: 'Début de la synchronisation globale' });
  await createCookieFile(sendEvent);
  await ensureDirectoryExists('/root/.spotdl/temp');

  const token = await getSpotifyAccessToken();
  const playlists = await getOurMusicPlaylists(token);
  if (!playlists.length) return sendEvent({ message: "Aucune playlist 'ourmusic' trouvée." });

  for (const playlist of playlists) {
    await handlePlaylistSync(playlist, token, sendEvent);
    await delay(Number(process.env.RATE_LIMIT_MS) || 5000);
  }

  await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
  sendEvent({ message: 'Synchronisation complète terminée.' });
}

export async function spotifySyncById(req, sendEvent, playlistId) {
  await verifyAdmin(req);
  sendEvent({ message: `Synchronisation de la playlist ID ${playlistId}` });
  await createCookieFile(sendEvent);
  await ensureDirectoryExists('/root/.spotdl/temp');

  const token = await getSpotifyAccessToken();
  const playlist = (await getAllUserPlaylists(token)).find(p => p.id === playlistId);
  if (!playlist) return sendEvent({ error: `Playlist ${playlistId} introuvable.` });

  await handlePlaylistSync(playlist, token, sendEvent);
  await runCommand(['chmod', '-R', '777', process.env.PLAYLIST_PATH]);
  sendEvent({ message: `Playlist ${playlist.name} synchronisée.` });
}

async function handlePlaylistSync(playlist, token, sendEvent) {
  const dir = await createPlaylistDirectory(playlist);
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const syncFilePath = path.join(dir, `${safeName}.sync.spotdl`);

  if (await fileExists(syncFilePath)) {
    sendEvent({ message: `Fichier de sync existant : ${playlist.name}` });
    await syncPlaylistFile(syncFilePath, dir, sendEvent);
  } else {
    sendEvent({ message: `Création du fichier sync : ${playlist.name}` });
    await createSyncFile(playlist, dir, sendEvent);
    await syncPlaylistFile(syncFilePath, dir, sendEvent);
  }
}
