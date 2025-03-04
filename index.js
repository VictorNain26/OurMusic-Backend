// index.js
import * as fs from "fs/promises";
import path from "path";
import axios from "axios";
import puppeteer from "puppeteer";

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_USER_ID,
  SPOTIFY_REFRESH_TOKEN,
  PLAYLIST_PATH,
  COOKIE_FILE,
  PORT,
  FIREFOX_FOLDER = "/app/mozilla/firefox",
  FIREFOX_PROFILE = "jixmpje9.default",
  RATE_LIMIT_MS = "5000",
} = Bun.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_USER_ID) {
  throw new Error(
    "Les variables d'environnement Spotify doivent être définies. Vérifiez SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET et SPOTIFY_USER_ID."
  );
}

if (!PLAYLIST_PATH || !COOKIE_FILE) {
  throw new Error("Les variables d'environnement PLAYLIST_PATH et COOKIE_FILE doivent être définies.");
}

const port = Number(PORT) || 3000;
let cachedToken = null;
let tokenExpiry = 0;

// ----------------------------------------------------------------
// Fonctions utilitaires
// ----------------------------------------------------------------

function getCorsHeaders(req) {
  const origin = req.headers.get("Origin") || "https://ourmusic.fr";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath, fs.constants.F_OK);
    await fs.chmod(dirPath, 0o777);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`Dossier créé : ${dirPath}`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
  const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";
  if (stderrText.trim()) {
    console.error(stderrText.trim());
    throw new Error(stderrText.trim());
  }
  return stdoutText.trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----------------------------------------------------------------
// Fonctions Spotify avec rafraîchissement du token
// ----------------------------------------------------------------

/**
 * Retourne un token d'accès Spotify.
 * Utilise le refresh token si disponible (SPOTIFY_REFRESH_TOKEN) pour obtenir un token utilisateur
 * avec les scopes requis pour créer/modifier des playlists.
 */
async function getSpotifyAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  if (SPOTIFY_REFRESH_TOKEN) {
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: SPOTIFY_REFRESH_TOKEN,
          client_id: SPOTIFY_CLIENT_ID,
          client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      cachedToken = response.data.access_token;
      tokenExpiry = now + (response.data.expires_in - 60) * 1000;
      return cachedToken;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du token Spotify:", error.message);
      throw new Error("Impossible de rafraîchir le token Spotify.");
    }
  } else {
    // Sinon, utiliser le flux client_credentials (attention : ce token ne permet pas de modifier les playlists)
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "client_credentials",
          client_id: SPOTIFY_CLIENT_ID,
          client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      cachedToken = response.data.access_token;
      tokenExpiry = now + (response.data.expires_in - 60) * 1000;
      return cachedToken;
    } catch (error) {
      console.error("Erreur lors de l'obtention du token Spotify:", error.message);
      throw new Error("Impossible de récupérer un token Spotify.");
    }
  }
}

async function getOurMusicPlaylists(token) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.data.items) throw new Error("Structure inattendue des données de Spotify.");
    return response.data.items.filter((playlist) =>
      playlist.name.toLowerCase().includes("ourmusic")
    );
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error("Token Spotify invalide ou insuffisamment autorisé (scopes manquants).");
    }
    console.error("Erreur lors de la récupération des playlists Spotify:", error.message);
    throw new Error("Impossible de récupérer les playlists Spotify.");
  }
}

async function createPlaylistDirectory(playlist) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const playlistDirPath = path.join(PLAYLIST_PATH, safeName);
  await ensureDirectoryExists(playlistDirPath);
  return playlistDirPath;
}

async function createSyncFile(playlist, playlistDirPath, sendEvent) {
  const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);
  const cmd = [
    "spotdl",
    "sync",
    playlist.external_urls.spotify,
    "--save-file",
    syncFilePath,
    "--output",
    playlistDirPath,
    "--cookie-file",
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Fichier de synchronisation créé pour '${playlist.name}' : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la création du fichier de synchronisation pour '${playlist.name}' : ${err.message}` });
  }
  return syncFilePath;
}

async function syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent) {
  const cmd = [
    "spotdl",
    "sync",
    syncFilePath,
    "--output",
    playlistDirPath,
    "--cookie-file",
    COOKIE_FILE,
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Synchronisation réussie pour '${syncFilePath}' : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la synchronisation du fichier '${syncFilePath}' : ${err.message}` });
  }
}

async function createCookieFile(sendEvent) {
  const cookieAgeLimit = 24 * 60 * 60 * 1000; // 24h en ms
  try {
    const fileStats = await fs.stat(COOKIE_FILE);
    const age = Date.now() - fileStats.mtimeMs;
    if (age < cookieAgeLimit) {
      sendEvent({ message: "Le cookie est récent (< 24h), mise à jour non nécessaire." });
      return;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      sendEvent({ error: `Erreur lors de la vérification du cookie : ${error.message}` });
      throw error;
    }
  }
  const cookiesFromBrowserArg = `firefox:${FIREFOX_FOLDER}/${FIREFOX_PROFILE}`;
  const cmd = [
    "yt-dlp",
    "--cookies-from-browser",
    cookiesFromBrowserArg,
    "--cookies",
    COOKIE_FILE,
    "--skip-download",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
  ];
  try {
    const output = await runCommand(cmd);
    sendEvent({ message: `Cookie créé avec succès : ${output}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de la création du cookie : ${err.message}` });
  }
}

// ----------------------------------------------------------------
// Partie Scraping & Mise à jour Spotify via Scraping
// ----------------------------------------------------------------

/**
 * Recherche un morceau sur Spotify par artiste et titre.
 * Retourne l'URI du morceau si trouvé, sinon null.
 */
async function searchTrackOnSpotify(artist, title, token) {
  const query = encodeURIComponent(`track:${title} artist:${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.data.tracks.items.length > 0) {
      return response.data.tracks.items[0].uri;
    }
    return null;
  } catch (err) {
    console.error(`Erreur lors de la recherche de "${artist} - ${title}" :`, err.message);
    return null;
  }
}

/**
 * Scrape les morceaux pour plusieurs genres sur plusieurs pages.
 * Renvoie un objet dont chaque clé est un genre et la valeur est un tableau de morceaux ({ artist, title, tags }).
 * Seul le premier morceau rencontré pour chaque artiste est conservé.
 */
async function scrapeTracksForGenres(genres, pagesPerGenre, excludedTags) {
  const browser = await puppeteer.launch({
    browserWSEndpoint: "ws://127.0.0.1:9222",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const results = {};
  for (const genre of genres) {
    results[genre] = [];
    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      let url = `https://hypem.com/tags/${genre}`;
      if (pageNum > 1) {
        url += `/${pageNum}`;
      }
      console.log(`Scraping ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector("h3.track_name");
      const tracks = await page.evaluate((excluded) => {
        const trackElements = Array.from(document.querySelectorAll("h3.track_name"));
        return trackElements
          .map((el) => {
            const artist = el.querySelector("a.artist")?.innerText.trim() || "";
            const title = el.querySelector("a.track")?.innerText.trim() || "";
            const sectionPlayer = el.closest(".section-player");
            const tagContainer = sectionPlayer ? sectionPlayer.querySelector("ul.tags") : null;
            const tags = tagContainer
              ? Array.from(tagContainer.querySelectorAll("a")).map((a) => a.innerText.trim())
              : [];
            const lowerTags = tags.map((t) => t.toLowerCase());
            if (excluded.some((ex) => lowerTags.includes(ex.toLowerCase()))) {
              return null;
            }
            return { artist, title, tags };
          })
          .filter((track) => track !== null);
      }, excludedTags);
      results[genre].push(...tracks);
    }
    // Conserver uniquement le premier morceau par artiste (un seul morceau par groupe)
    const seenArtists = new Set();
    results[genre] = results[genre].filter((track) => {
      const artistKey = track.artist.toLowerCase();
      if (seenArtists.has(artistKey)) return false;
      seenArtists.add(artistKey);
      return true;
    });
  }
  await browser.close();
  return results;
}

/**
 * Récupère toutes les playlists de l'utilisateur via l'endpoint /v1/me/playlists.
 */
async function getAllUserPlaylists(token) {
  let allPlaylists = [];
  let url = `https://api.spotify.com/v1/me/playlists?limit=50`;
  while (url) {
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    allPlaylists = allPlaylists.concat(response.data.items);
    url = response.data.next;
  }
  return allPlaylists;
}

/**
 * Récupère tous les morceaux d'une playlist en paginant.
 * On récupère ici les propriétés "added_at" et "track(uri)".
 */
async function getAllPlaylistTracks(playlistId, token) {
  let tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(added_at,track(uri))&limit=100`;
  while (url) {
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    tracks = tracks.concat(response.data.items);
    url = response.data.next;
  }
  return tracks;
}

/**
 * Supprime les morceaux les plus anciens d'une playlist si elle dépasse 50 morceaux.
 * On trie par date d'ajout (added_at) et on supprime les plus vieux jusqu'à atteindre 50 morceaux.
 */
async function trimPlaylist(playlist, token, sendEvent) {
  const tracks = await getAllPlaylistTracks(playlist.id, token);
  if (tracks.length <= 50) {
    sendEvent({ message: `La playlist "${playlist.name}" contient ${tracks.length} morceaux (pas de suppression nécessaire).` });
    return;
  }
  // On crée un tableau avec l'index d'origine et la date d'ajout
  const tracksWithIndex = tracks.map((item, index) => ({
    index,
    added_at: item.added_at,
    uri: item.track.uri
  }));
  // Trier par date d'ajout croissante (les plus anciens en premier)
  tracksWithIndex.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
  const numberToRemove = tracks.length - 50;
  const tracksToRemove = tracksWithIndex.slice(0, numberToRemove);

  sendEvent({ message: `Suppression de ${numberToRemove} morceaux les plus anciens dans la playlist "${playlist.name}".` });
  for (const track of tracksToRemove) {
    try {
      await axios.request({
        url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        data: { tracks: [{ uri: track.uri, positions: [track.index] }] }
      });
      sendEvent({ message: `Supprimé : ${track.uri} (position ${track.index})` });
    } catch (err) {
      sendEvent({ error: `Erreur lors de la suppression du morceau ${track.uri} : ${err.message}` });
    }
  }
}

/**
 * Pour chaque genre scrappé, recherche sur Spotify les morceaux correspondants,
 * recherche (ou crée) une playlist dédiée et ajoute les nouveaux morceaux.
 * Puis, à la fin du processus, on supprime les morceaux les plus anciens si la playlist dépasse 50 morceaux.
 */
async function updateSpotifyPlaylistsFromScraping(sendEvent) {
  const genres = ["indie+rock", "pop", "rock", "electronica", "hip+hop"];
  const pagesPerGenre = 1;
  const excludedTags = ["trance", "metal", "dubstep", "death+metal", "acid"];

  const scrapedData = await scrapeTracksForGenres(genres, pagesPerGenre, excludedTags);
  const token = await getSpotifyAccessToken();

  // Récupérer l'ensemble des playlists de l'utilisateur
  let userPlaylists;
  try {
    userPlaylists = await getAllUserPlaylists(token);
  } catch (err) {
    console.error("Erreur lors de la récupération des playlists de l'utilisateur :", err.message);
    return;
  }

  for (const genre of genres) {
    const tracks = scrapedData[genre];
    console.log(`Genre "${genre}" - ${tracks.length} morceaux scrappés.`);
    const trackUris = [];
    for (const track of tracks) {
      const uri = await searchTrackOnSpotify(track.artist, track.title, token);
      if (uri) {
        trackUris.push(uri);
      }
      await delay(500);
    }
    console.log(`Genre "${genre}" - ${trackUris.length} morceaux trouvés sur Spotify.`);
    const targetPlaylistName = `OurMusic - ${genre}`;
    const normalizedTarget = targetPlaylistName.trim().toLowerCase();

    // Recherche parmi toutes les playlists de l'utilisateur
    let playlist = userPlaylists.find(
      (p) => p.name && p.name.trim().toLowerCase() === normalizedTarget
    );
    if (!playlist) {
      try {
        const createResponse = await axios.post(
          `https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/playlists`,
          {
            name: targetPlaylistName,
            description: `Playlist générée automatiquement pour le genre ${genre}`,
            public: true  // La playlist sera publique
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        playlist = createResponse.data;
        sendEvent({ message: `Playlist créée : ${playlist.name}` });
        // Mettre à jour la liste locale avec la nouvelle playlist
        userPlaylists.push(playlist);
      } catch (err) {
        sendEvent({ error: `Erreur lors de la création de la playlist pour "${genre}" : ${err.message}` });
        continue;
      }
    } else {
      sendEvent({ message: `Utilisation de la playlist existante : ${playlist.name}` });
    }

    let existingUris = [];
    try {
      const url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri))&limit=100`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      existingUris = response.data.items.map((item) => item.track.uri);
    } catch (err) {
      console.error(`Erreur lors de la récupération des morceaux de la playlist ${playlist.id} :`, err.message);
    }
    const newUris = trackUris.filter((uri) => !existingUris.includes(uri));
    if (newUris.length > 0) {
      try {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          { uris: newUris },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        sendEvent({ message: `Ajout de ${newUris.length} nouveaux morceaux dans la playlist "${playlist.name}" pour le genre "${genre}".` });
      } catch (err) {
        sendEvent({ error: `Erreur lors de l'ajout de morceaux à la playlist "${playlist.name}" : ${err.message}` });
      }
    } else {
      sendEvent({ message: `Aucun nouveau morceau à ajouter dans la playlist "${playlist.name}" pour le genre "${genre}".` });
    }
    // À la fin du traitement du genre, on vérifie et supprime l'excédent de morceaux si nécessaire.
    await trimPlaylist(playlist, token, sendEvent);
  }
}

// ----------------------------------------------------------------
// Fonction de synchronisation (playlist sync et téléchargement via spotdl)
// ----------------------------------------------------------------

async function syncEverything(sendEvent) {
  sendEvent({ message: "Début de la synchronisation" });
  
  // Création du cookie
  await createCookieFile(sendEvent);
  await ensureDirectoryExists("/root/.spotdl/temp");
  
  const token = await getSpotifyAccessToken();
  const playlists = await getOurMusicPlaylists(token);
  const total = playlists.length;
  if (total === 0) {
    sendEvent({ message: "Aucune playlist 'ourmusic' trouvée. Vérifiez l'ID utilisateur Spotify et la visibilité des playlists." });
    return;
  }
  let count = 0;
  for (const playlist of playlists) {
    const playlistDirPath = await createPlaylistDirectory(playlist);
    const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);
    
    if (await fileExists(syncFilePath)) {
      sendEvent({ message: `Le fichier de synchronisation pour '${playlist.name}' existe déjà. Lancement de la synchronisation.` });
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    } else {
      sendEvent({ message: `Création du fichier de synchronisation pour '${playlist.name}'.` });
      await createSyncFile(playlist, playlistDirPath, sendEvent);
      await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
    }
    
    count++;
    sendEvent({ message: `Traitement de la playlist '${playlist.name}' terminé (${count}/${total}).` });
    await delay(Number(RATE_LIMIT_MS));
  }
  
  try {
    await runCommand(["chmod", "-R", "777", PLAYLIST_PATH]);
    sendEvent({ message: `Permissions 777 appliquées récursivement sur ${PLAYLIST_PATH}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de l'application des permissions : ${err.message}` });
  }
  sendEvent({ message: "Toutes les playlists ont été synchronisées avec succès !" });
}

// ----------------------------------------------------------------
// Serveur Bun avec deux endpoints SSE
// ----------------------------------------------------------------

Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Endpoint pour le scraping et la création/mise à jour des playlists Spotify
    if (url.pathname === "/api/live/spotify/scrape") {
      const headers = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      };

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            `data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`
          );
          const heartbeat = setInterval(() => {
            controller.enqueue(
              `data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`
            );
          }, 30000);

          function sendEvent(data) {
            controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
          }

          try {
            await updateSpotifyPlaylistsFromScraping(sendEvent);
            sendEvent({ message: "Mise à jour Spotify via scraping terminée." });
          } catch (error) {
            sendEvent({ error: error.message });
          } finally {
            clearInterval(heartbeat);
            controller.close();
          }
        },
      });
      return new Response(stream, { headers });
    }
    // Endpoint pour la synchronisation des playlists Spotify et le téléchargement via spotdl
    else if (url.pathname === "/api/live/spotify/sync") {
      const headers = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      };

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            `data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`
          );
          const heartbeat = setInterval(() => {
            controller.enqueue(
              `data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`
            );
          }, 30000);

          function sendEvent(data) {
            controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
          }

          try {
            await syncEverything(sendEvent);
            sendEvent({ message: "Synchronisation Spotify et téléchargement terminés." });
          } catch (error) {
            sendEvent({ error: error.message });
          } finally {
            clearInterval(heartbeat);
            controller.close();
          }
        },
      });
      return new Response(stream, { headers });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});

console.log(`Serveur Bun démarré sur le port ${port}`);
