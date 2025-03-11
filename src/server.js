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
  trimPlaylist
} from "./spotify.js";
import { scrapeTracksForGenres } from "./scraper.js";
import axios from "axios";
import path from "path";
import { ensureDirectoryExists, fileExists, runCommand } from "./utils.js";
import { initDatabase, User, LikedTrack } from "./db.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const { PORT, RATE_LIMIT_MS, JWT_SECRET } = Bun.env;
const port = Number(PORT) || 3000;

// Durées d'expiration
const ACCESS_EXPIRES = "15m";  // Access token = 15 minutes
const REFRESH_EXPIRES = "7d";  // Refresh token = 7 jours

// Initialisation de la base de données
await initDatabase();

/** 
 * Génère un access token (JWT) avec durée de vie courte 
 */
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/** 
 * Génère un refresh token (JWT) avec durée de vie plus longue 
 */
function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/** 
 * Vérifie l'access token (header Authorization: Bearer ...) 
 */
async function verifyAccessToken(req) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    return user || null;
  } catch (err) {
    return null;
  }
}

/** 
 * Vérifie le refresh token (cookie "refresh=...") 
 */
async function verifyRefreshToken(req) {
  const cookieHeader = req.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(^|;\s*)refresh=([^;]+)/);
  if (!match) return null;

  const token = match[2];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    return user || null;
  } catch (err) {
    return null;
  }
}

/** 
 * Vérifie que l'utilisateur est admin 
 */
async function verifyAdmin(req) {
  const user = await verifyAccessToken(req);
  if (!user || user.role !== "admin") {
    throw new Error("Accès refusé: droits administrateur requis.");
  }
  return user;
}

/**
 * Crée un flux SSE via createSSEStream((sendEvent) => {...}).
 * On envoie un heartbeat toutes les 30s, et on ferme le flux au return. 
 */
function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      // Premier message de connexion
      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`);

      // Heartbeat toutes les 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
      }, 30000);

      function sendEvent(data) {
        // Envoie un objet JSON sous forme SSE
        controller.enqueue(`data: ${JSON.stringify({ pub: data })}\n\n`);
      }

      try {
        // Appel de la fonction SSE
        await handler(sendEvent);
      } catch (error) {
        // On envoie l'erreur au client SSE
        sendEvent({ error: error.message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
}

// Lancement du serveur Bun
Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const corsHeaders = getCorsHeaders(req);
    const url = new URL(req.url);
    const routeKey = `${req.method}:${url.pathname}`;

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handlers d'authentification (Access + Refresh)
    const authHandlers = {
      // 1) Inscription
      async register(req, corsHeaders) {
        const { username, email, password } = await req.json();
        if (!username || !email || !password) {
          return Response.json({ error: "Tous les champs sont requis" }, { status: 400, headers: corsHeaders });
        }
        try {
          const existing = await User.findOne({ where: { email } });
          if (existing) {
            return Response.json({ error: "Cet email est déjà utilisé" }, { status: 400, headers: corsHeaders });
          }
          const newUser = await User.create({ username, email, password });
          return Response.json({
            message: "Utilisateur créé",
            user: { id: newUser.id, email: newUser.email, username: newUser.username },
          }, { status: 201, headers: corsHeaders });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }
      },

      // 2) Login: renvoie accessToken + cookie refresh
      async login(req, corsHeaders) {
        const { email, password } = await req.json();
        const user = await User.findOne({ where: { email } });
        if (!user) {
          return Response.json({ error: "Identifiants invalides" }, { status: 401, headers: corsHeaders });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return Response.json({ error: "Identifiants invalides" }, { status: 401, headers: corsHeaders });
        }
        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        const refreshCookie = `refresh=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`;

        return new Response(JSON.stringify({
          message: "Connexion réussie",
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Set-Cookie": refreshCookie,
            "Content-Type": "application/json"
          }
        });
      },

      // 3) Refresh
      async refresh(req, corsHeaders) {
        const user = await verifyRefreshToken(req);
        if (!user) {
          return Response.json({ error: "Refresh token invalide" }, { status: 401, headers: corsHeaders });
        }
        const newAccess = signAccessToken(user);
        return Response.json({ accessToken: newAccess }, { status: 200, headers: corsHeaders });
      },

      // 4) /api/auth/me
      async me(req, corsHeaders) {
        const user = await verifyAccessToken(req);
        if (!user) {
          return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
        }
        return Response.json({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        }, { headers: corsHeaders });
      },

      // 5) logout
      async logout(req, corsHeaders) {
        const refreshCookie = `refresh=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
        return new Response(JSON.stringify({ message: "Déconnexion réussie" }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Set-Cookie": refreshCookie,
            "Content-Type": "application/json"
          }
        });
      },
    };

    // Handlers SSE
    const spotifyHandlers = {
      // 1) /api/live/spotify/scrape
      async spotifyScrape(req, sendEvent) {
        console.log("Début du handler /scrape");
        await verifyAdmin(req);
        console.log("Utilisateur admin ok, début du scraping...");

        try {
          const genres = ["indie+rock", "pop", "rock", "electronica", "hip+hop"];
          const excludedTags = ["trance", "metal", "dubstep", "death+metal", "acid"];
          const pagesPerGenre = 1;

          // Lancement du scraping
          console.log("Appel de scrapeTracksForGenres...");
          const scrapedData = await scrapeTracksForGenres(genres, pagesPerGenre, excludedTags);

          // Récupération token Spotify
          const token = await getSpotifyAccessToken();

          // Récupération de toutes les playlists utilisateur
          let userPlaylists;
          try {
            userPlaylists = await getAllUserPlaylists(token);
          } catch (err) {
            sendEvent({ error: err.message });
            return; 
          }

          for (const genre of genres) {
            const tracks = scrapedData[genre] || [];
            console.log(`Genre "${genre}" - ${tracks.length} morceaux scrappés.`);
            const trackUris = [];

            // Rechercher chaque track
            for (const track of tracks) {
              const uri = await searchTrackOnSpotify(track.artist, track.title, token);
              if (uri) trackUris.push(uri);
              await delay(500);
            }
            console.log(`Genre "${genre}" - ${trackUris.length} morceaux trouvés sur Spotify.`);

            // Nom de la playlist
            const targetPlaylistName = `OurMusic - ${genre}`.trim().toLowerCase();

            let playlist = userPlaylists.find((p) => p.name && p.name.trim().toLowerCase() === targetPlaylistName);

            if (!playlist) {
              try {
                // Création playlist
                const createResponse = await axios.post(
                  `https://api.spotify.com/v1/users/${process.env.SPOTIFY_USER_ID}/playlists`,
                  {
                    name: `OurMusic - ${genre}`,
                    description: `Playlist générée automatiquement pour le genre ${genre}`,
                    public: true,
                  },
                  { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
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

            // Vérifier les URIs déjà présentes
            let existingUris = [];
            try {
              const url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?fields=items(track(uri))&limit=100`;
              const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
              existingUris = response.data.items.map((item) => item.track.uri);
            } catch (err) {
              console.error(`Erreur lors de la récupération des morceaux de la playlist ${playlist.id} :`, err.message);
            }

            // Filtrer celles à ajouter
            const newUris = trackUris.filter((uri) => !existingUris.includes(uri));
            if (newUris.length > 0) {
              try {
                await axios.post(
                  `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
                  { uris: newUris },
                  { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                sendEvent({ message: `Ajout de ${newUris.length} nouveaux morceaux dans "${playlist.name}".` });
              } catch (err) {
                sendEvent({ error: `Erreur lors de l'ajout de morceaux à "${playlist.name}" : ${err.message}` });
              }
            } else {
              sendEvent({ message: `Aucun nouveau morceau à ajouter pour "${genre}".` });
            }

            // Trim la playlist à 50
            await trimPlaylist(playlist, token, sendEvent);

            // Delay
            await delay(2000);
          }

          sendEvent({ message: "Mise à jour Spotify via scraping terminée." });
          console.log("Fin scraping /scrape");

        } catch (error) {
          console.error("Erreur dans spotifyScrape:", error);
          sendEvent({ error: error.message });
        }
      },

      // 2) /api/live/spotify/sync (global)
      async spotifySync(req, sendEvent) {
        await verifyAdmin(req);
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
          sendEvent({ message: "Aucune playlist 'ourmusic' trouvée." });
          return;
        }
        let count = 0;
        for (const playlist of playlists) {
          const playlistDirPath = await createPlaylistDirectory(playlist);
          const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
          const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);

          if (await fileExists(syncFilePath)) {
            sendEvent({ message: `Le fichier de synchronisation pour '${playlist.name}' existe déjà. On sync...` });
            await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
          } else {
            sendEvent({ message: `Création du fichier de synchronisation pour '${playlist.name}'.` });
            await createSyncFile(playlist, playlistDirPath, sendEvent);
          }
          count++;
          sendEvent({ message: `Traitement de '${playlist.name}' terminé (${count}/${playlists.length}).` });
          await delay(Number(RATE_LIMIT_MS) || 5000);
        }

        try {
          await runCommand(["chmod", "-R", "777", process.env.PLAYLIST_PATH]);
          sendEvent({ message: `Permissions 777 appliquées sur ${process.env.PLAYLIST_PATH}` });
        } catch (err) {
          sendEvent({ error: `Erreur lors de chmod: ${err.message}` });
        }

        sendEvent({ message: "Toutes les playlists ont été synchronisées avec succès !" });
      },

      // 3) /api/live/spotify/sync/:playlistId
      async spotifySyncIndividual(req, sendEvent, playlistId) {
        await verifyAdmin(req);
        sendEvent({ message: `Début de la synchronisation pour la playlist ${playlistId}` });

        await createCookieFile(sendEvent);
        await ensureDirectoryExists("/root/.spotdl/temp");
        const token = await getSpotifyAccessToken();

        let playlist;
        try {
          const all = await getAllUserPlaylists(token);
          playlist = all.find(p => p.id === playlistId);
          if (!playlist) {
            sendEvent({ error: `Playlist ID ${playlistId} non trouvée.` });
            return;
          }
        } catch (err) {
          sendEvent({ error: err.message });
          return;
        }

        const playlistDirPath = await createPlaylistDirectory(playlist);
        const safeName = playlist.name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
        const syncFilePath = path.join(playlistDirPath, `${safeName}.sync.spotdl`);

        if (await fileExists(syncFilePath)) {
          sendEvent({ message: `Fichier de sync existant pour '${playlist.name}'. On sync...` });
          await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
        } else {
          sendEvent({ message: `Création du fichier sync pour '${playlist.name}'.` });
          await createSyncFile(playlist, playlistDirPath, sendEvent);
          await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
        }

        try {
          await runCommand(["chmod", "-R", "777", process.env.PLAYLIST_PATH]);
          sendEvent({ message: `Permissions 777 appliquées sur ${process.env.PLAYLIST_PATH}` });
        } catch (err) {
          sendEvent({ error: `Erreur lors chmod: ${err.message}` });
        }

        sendEvent({ message: `La playlist '${playlist.name}' a été synchronisée avec succès !` });
      }
    };

    // Mapping des routes
    const localRouteMap = {
      "POST:/api/auth/register": () => authHandlers.register(req, corsHeaders),
      "POST:/api/auth/login": () => authHandlers.login(req, corsHeaders),
      "POST:/api/auth/refresh": () => authHandlers.refresh(req, corsHeaders),
      "GET:/api/auth/me": () => authHandlers.me(req, corsHeaders),
      "POST:/api/auth/logout": () => authHandlers.logout(req, corsHeaders),

      "POST:/api/track/like": async () => {
        const user = await verifyAccessToken(req);
        if (!user) {
          return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
        }

        const { title, artist, artwork, youtubeUrl } = await req.json();
        if (!title || !artist || !artwork || !youtubeUrl) {
          return Response.json({ error: "Tous les champs (title, artist, artwork, youtubeUrl) sont requis" }, { status: 400, headers: corsHeaders });
        }

        // Empêcher les doublons pour un même utilisateur
        const existing = await LikedTrack.findOne({ where: { UserId: user.id, title, artist } });
        if (existing) {
          return Response.json({ error: "Ce morceau est déjà liké" }, { status: 400, headers: corsHeaders });
        }

        try {
          const likedTrack = await LikedTrack.create({ title, artist, artwork, youtubeUrl, UserId: user.id });
          return Response.json({ message: "Morceau liké", likedTrack }, { status: 201, headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
        }
      },

      "DELETE:/api/track/like": async () => {
        const user = await verifyAccessToken(req);
        if (!user) {
          return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
        }

        const { id } = await req.json();
        if (!id) {
          return Response.json({ error: "L'ID du morceau est requis pour retirer le like" }, { status: 400, headers: corsHeaders });
        }

        const track = await LikedTrack.findOne({ where: { id, UserId: user.id } });
        if (!track) {
          return Response.json({ error: "Morceau non trouvé" }, { status: 404, headers: corsHeaders });
        }

        try {
          await track.destroy();
          return Response.json({ message: "Morceau retiré des likes" }, { status: 200, headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
        }
      },

      "GET:/api/track/like": async () => {
        const user = await verifyAccessToken(req);
        if (!user) {
          return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
        }

        try {
          const likedTracks = await LikedTrack.findAll({ where: { UserId: user.id } });
          return Response.json({ likedTracks }, { status: 200, headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
        }
      },

      // SSE /api/live/spotify/scrape
      "GET:/api/live/spotify/scrape": () => new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifyScrape(req, sendEvent)),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          }
        }
      ),

      // SSE /api/live/spotify/sync
      "GET:/api/live/spotify/sync": () => new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifySync(req, sendEvent)),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          }
        }
      ),
    };

    // Cas /api/live/spotify/sync/:playlistId
    if (routeKey.startsWith("GET:/api/live/spotify/sync/")) {
      const playlistId = url.pathname.split("/").pop();
      return new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifySyncIndividual(req, sendEvent, playlistId)),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          }
        }
      );
    }

    // 404 par défaut
    if (localRouteMap[routeKey]) {
      return await localRouteMap[routeKey]();
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});
