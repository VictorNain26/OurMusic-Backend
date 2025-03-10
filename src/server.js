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
import { initDatabase, User } from "./db.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const { PORT, RATE_LIMIT_MS, JWT_SECRET } = Bun.env;
const port = Number(PORT) || 3000;
const ACCESS_EXPIRES = "15m";   // Durée d'un access token
const REFRESH_EXPIRES = "7d";   // Durée d'un refresh token

await initDatabase();

/**
 * Génère un access token (JWT) à durée de vie courte.
 * Contient l'id, email, role de l'utilisateur.
 */
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/**
 * Génère un refresh token (JWT) à durée de vie plus longue.
 * On pourrait y mettre un champ "type: refresh" ou "version", etc.
 */
function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/**
 * Vérifie et décode un access token (à lire depuis le header Authorization).
 */
async function verifyAccessToken(req) {
  // Chercher le header Authorization: Bearer ...
  let authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Récupérer l'utilisateur
    const user = await User.findByPk(decoded.id);
    return user || null;
  } catch (err) {
    return null;
  }
}

/**
 * Vérifie et décode un refresh token (à lire depuis le cookie 'refresh').
 */
async function verifyRefreshToken(req) {
  const cookieHeader = req.headers.get("Cookie") || "";
  // Cherche refresh=...
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
 * Vérifie que l'utilisateur connecté est admin (via access token).
 */
async function verifyAdmin(req) {
  const user = await verifyAccessToken(req);
  if (!user || user.role !== "admin") {
    throw new Error("Accès refusé: droits administrateur requis.");
  }
  return user;
}

/**
 * SSE helper
 */
function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`);
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
      }, 30000);

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

    // Handlers d’authentification avec Access+Refresh
    const authHandlers = {
      // 1) Inscription
      async register(req, corsHeaders) {
        const { username, email, password } = await req.json();
        if (!username || !email || !password) {
          return Response.json({ error: "Tous les champs sont requis" }, { status: 400, headers: corsHeaders });
        }
        try {
          // Vérifie s'il n'y a pas déjà un user
          const existing = await User.findOne({ where: { email } });
          if (existing) {
            return Response.json({ error: "Cet email est déjà utilisé" }, { status: 400, headers: corsHeaders });
          }
          // Création
          const newUser = await User.create({ username, email, password });
          return Response.json({
            message: "Utilisateur créé",
            user: { id: newUser.id, email: newUser.email, username: newUser.username }
          }, { status: 201, headers: corsHeaders });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
        }
      },

      // 2) Login : renvoie accessToken + setCookie refresh
      async login(req, corsHeaders) {
        const { email, password } = await req.json();
        // Cherche l'utilisateur
        const user = await User.findOne({ where: { email } });
        if (!user) {
          return Response.json({ error: "Identifiants invalides" }, { status: 401, headers: corsHeaders });
        }
        // Vérifie le mot de passe
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return Response.json({ error: "Identifiants invalides" }, { status: 401, headers: corsHeaders });
        }
        // Génère Access & Refresh
        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        // Place le refresh token dans un cookie HttpOnly
        // Secure + SameSite=None => OK pour HTTPS cross-site
        // On donne 7 jours en secondes => 7 * 24 * 3600 = 604800
        const refreshCookie = `refresh=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`;

        // Retourne l'access token dans le body
        // (Le front le stockera en mémoire ou localStorage)
        return new Response(JSON.stringify({
          message: "Connexion réussie",
          accessToken, // le front utilisera ce token
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

      // 3) /api/auth/refresh : lit le cookie "refresh" et renvoie un nouvel access token
      async refresh(req, corsHeaders) {
        const user = await verifyRefreshToken(req);
        if (!user) {
          return Response.json({ error: "Refresh token invalide" }, { status: 401, headers: corsHeaders });
        }
        // OK => renvoyer un nouvel Access Token
        const newAccess = signAccessToken(user);

        // Optionnel : on peut régénérer un nouveau refresh token (rotation)
        // const newRefresh = signRefreshToken(user);
        // const refreshCookie = `refresh=${newRefresh}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`;
        // let extraHeaders = { "Set-Cookie": refreshCookie, ...corsHeaders };

        return Response.json({ accessToken: newAccess }, { status: 200, headers: corsHeaders });
      },

      // 4) /api/auth/me : lit l'access token (header Authorization)
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

      // 5) /api/auth/logout : efface le cookie refresh
      async logout(req, corsHeaders) {
        // On efface le cookie => Max-Age=0
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

    // Handlers Spotify (inchangés, sauf qu'on utilise verifyAdmin() => access token)
    const spotifyHandlers = {
      async spotifyScrape(req, sendEvent) {
        await verifyAdmin(req); // => lit un access token "Bearer" + vérifie role=admin
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

        // (logique inchangée)
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
          await trimPlaylist(playlist, token, sendEvent);
          await delay(Number(RATE_LIMIT_MS) || 5000);
        }
        sendEvent({ message: "Mise à jour Spotify via scraping terminée." });
      },

      async spotifySync(req, sendEvent) {
        await verifyAdmin(req); // => admin check
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
            sendEvent({ message: `Le fichier de synchronisation pour '${playlist.name}' existe déjà. Lancement de la synchronisation.` });
            await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
          } else {
            sendEvent({ message: `Création du fichier de synchronisation pour '${playlist.name}'.` });
            await createSyncFile(playlist, playlistDirPath, sendEvent);
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
      },

      async spotifySyncIndividual(req, sendEvent, playlistId) {
        await verifyAdmin(req); // => admin check
        sendEvent({ message: `Début de la synchronisation pour la playlist ${playlistId}` });
        await createCookieFile(sendEvent);
        await ensureDirectoryExists("/root/.spotdl/temp");
        const token = await getSpotifyAccessToken();
        let playlist;
        try {
          const playlists = await getAllUserPlaylists(token);
          playlist = playlists.find(p => p.id === playlistId);
          if (!playlist) {
            sendEvent({ error: `Playlist avec l'ID ${playlistId} non trouvée.` });
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
          sendEvent({ message: `Le fichier de synchronisation pour '${playlist.name}' existe déjà. Lancement de la synchronisation.` });
          await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
        } else {
          sendEvent({ message: `Création du fichier de synchronisation pour '${playlist.name}'.` });
          await createSyncFile(playlist, playlistDirPath, sendEvent);
          await syncPlaylistFile(syncFilePath, playlistDirPath, sendEvent);
        }
        
        try {
          await runCommand(["chmod", "-R", "777", process.env.PLAYLIST_PATH]);
          sendEvent({ message: `Permissions 777 appliquées récursivement sur ${process.env.PLAYLIST_PATH}` });
        } catch (err) {
          sendEvent({ error: `Erreur lors de l'application des permissions : ${err.message}` });
        }
        
        sendEvent({ message: `La playlist '${playlist.name}' a été synchronisée avec succès !` });
      }
    };

    // Mapping des routes (incluant notre nouveau "/api/auth/refresh")
    const localRouteMap = {
      "POST:/api/auth/register": () => authHandlers.register(req, corsHeaders),
      "POST:/api/auth/login": () => authHandlers.login(req, corsHeaders),
      "POST:/api/auth/refresh": () => authHandlers.refresh(req, corsHeaders),
      "GET:/api/auth/me": () => authHandlers.me(req, corsHeaders),
      "POST:/api/auth/logout": () => authHandlers.logout(req, corsHeaders),
      "GET:/api/live/spotify/scrape": () => new Response(createSSEStream((sendEvent) => spotifyHandlers.spotifyScrape(req, sendEvent)), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
      }),
      "GET:/api/live/spotify/sync": () => new Response(createSSEStream((sendEvent) => spotifyHandlers.spotifySync(req, sendEvent)), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
      }),
    };

    // Routage
    if (localRouteMap[routeKey]) {
      return await localRouteMap[routeKey]();
    } else if (url.pathname.startsWith("/api/live/spotify/sync/")) {
      const playlistId = url.pathname.split("/").pop();
      return new Response(createSSEStream((sendEvent) => spotifyHandlers.spotifySyncIndividual(req, sendEvent, playlistId)), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});
