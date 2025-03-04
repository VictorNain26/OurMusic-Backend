// src/server.js
import { getCorsHeaders, delay } from "./utils.js";
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
} from "./spotify.js";
import { scrapeTracksForGenres } from "./scraper.js";
import axios from "axios";
import path from "path";
import { ensureDirectoryExists, fileExists, runCommand } from "./utils.js";

const { PORT, RATE_LIMIT_MS } = Bun.env;
const port = Number(PORT) || 3000;

function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      // Message de connexion initiale
      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`);
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
      }, 30000);

      // Fonction pour envoyer des événements SSE
      function sendEvent(data) {
        controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
      }

      try {
        await handler(sendEvent);
      } catch (error) {
        sendEvent({ error: error.message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
}

async function handleSpotifyScrape(sendEvent) {
  const genres = ["indie+rock", "pop", "rock", "electronica", "hip+hop"];
  const pagesPerGenre = 1;
  const excludedTags = ["trance", "metal", "dubstep", "death+metal", "acid"];

  const scrapedData = await scrapeTracksForGenres(genres, pagesPerGenre, excludedTags);
  const token = await getSpotifyAccessToken();

  let userPlaylists;
  try {
    userPlaylists = await getAllUserPlaylists(token);
  } catch (err) {
    console.error("Erreur lors de la récupération des playlists de l'utilisateur :", err.message);
    sendEvent({ error: err.message });
    return;
  }

  for (const genre of genres) {
    const tracks = scrapedData[genre];
    console.log(`Genre "${genre}" - ${tracks.length} morceaux scrappés.`);
    const trackUris = [];
    for (const track of tracks) {
      const uri = await searchTrackOnSpotify(track.artist, track.title, token);
      if (uri) trackUris.push(uri);
      await delay(500);
    }
    console.log(`Genre "${genre}" - ${trackUris.length} morceaux trouvés sur Spotify.`);
    const targetPlaylistName = `OurMusic - ${genre}`;
    const normalizedTarget = targetPlaylistName.trim().toLowerCase();

    let playlist = userPlaylists.find(
      (p) => p.name && p.name.trim().toLowerCase() === normalizedTarget
    );
    if (!playlist) {
      try {
        const createResponse = await axios.post(
          `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USER_ID}/playlists`,
          {
            name: targetPlaylistName,
            description: `Playlist générée automatiquement pour le genre ${genre}`,
            public: true,
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
    // Vérifier et supprimer l'excédent de morceaux si la playlist dépasse 50 titres
    await trimPlaylist(playlist, token, sendEvent);
    await delay(Number(RATE_LIMIT_MS) || 5000);
  }
  sendEvent({ message: "Mise à jour Spotify via scraping terminée." });
}

async function handleSpotifySync(sendEvent) {
  sendEvent({ message: "Début de la synchronisation" });
  await createCookieFile(sendEvent);
  await ensureDirectoryExists("/root/.spotdl/temp");
  const token = await getSpotifyAccessToken();
  let playlists;
  try {
    playlists = await getOurMusicPlaylists(token);
  } catch (err) {
    sendEvent({ error: err.message });
    return;
  }
  if (playlists.length === 0) {
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
    sendEvent({ message: `Traitement de la playlist '${playlist.name}' terminé (${count}/${playlists.length}).` });
    await delay(Number(RATE_LIMIT_MS) || 5000);
  }
  try {
    await runCommand(["chmod", "-R", "777", process.env.PLAYLIST_PATH]);
    sendEvent({ message: `Permissions 777 appliquées récursivement sur ${process.env.PLAYLIST_PATH}` });
  } catch (err) {
    sendEvent({ error: `Erreur lors de l'application des permissions : ${err.message}` });
  }
  sendEvent({ message: "Toutes les playlists ont été synchronisées avec succès !" });
}

Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/api/live/spotify/scrape") {
      return new Response(createSSEStream(handleSpotifyScrape), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else if (url.pathname === "/api/live/spotify/sync") {
      return new Response(createSSEStream(handleSpotifySync), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});

console.log(`Serveur Bun démarré sur le port ${port}`);
