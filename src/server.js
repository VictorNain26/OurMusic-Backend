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
import { initDatabase, User } from "./db.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const { PORT, RATE_LIMIT_MS, JWT_SECRET } = Bun.env;
const port = Number(PORT) || 3000;

// Durées
const ACCESS_EXPIRES = "15m";  // Access token = 15 min
const REFRESH_EXPIRES = "7d";  // Refresh token = 7 jours

// Initialisation DB
await initDatabase();

/** Génère un access token (JWT) court */
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

/** Génère un refresh token (JWT) plus long */
function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

/** Vérifie Access Token (depuis Header Authorization: Bearer ...) */
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

/** Vérifie Refresh Token (depuis Cookie refresh=...) */
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

/** Vérifie que l'utilisateur est admin */
async function verifyAdmin(req) {
  const user = await verifyAccessToken(req);
  if (!user || user.role !== "admin") {
    throw new Error("Accès refusé: droits administrateur requis.");
  }
  return user;
}

/** Crée un flux SSE => usage createSSEStream((sendEvent) => {...}) */
function createSSEStream(handler) {
  return new ReadableStream({
    async start(controller) {
      // Envoyer un 1er message (connect/time) pour init
      controller.enqueue(`data: ${JSON.stringify({ connect: { time: Math.floor(Date.now() / 1000) } })}\n\n`);

      // Heartbeat pour garder la connexion SSE
      const heartbeat = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ pub: { heartbeat: Date.now() } })}\n\n`);
      }, 30000);

      function sendEvent(data) {
        // Envoie un objet JSON
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

// Lancement Bun
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

    // Handlers d’auth + SSE
    const authHandlers = {
      // Inscription
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

      // Login : émet un access token + refresh cookie
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

        // Refresh token dans un cookie HttpOnly
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

      // Refresh
      async refresh(req, corsHeaders) {
        const user = await verifyRefreshToken(req);
        if (!user) {
          return Response.json({ error: "Refresh token invalide" }, { status: 401, headers: corsHeaders });
        }
        const newAccess = signAccessToken(user);
        return Response.json({ accessToken: newAccess }, { status: 200, headers: corsHeaders });
      },

      // me
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

      // logout
      async logout(req, corsHeaders) {
        // Efface le refresh cookie
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

    const spotifyHandlers = {
      // SSE : /scrape
      async spotifyScrape(req, sendEvent) {
        await verifyAdmin(req);

        const genres = ["indie+rock", "pop", "rock", "electronica", "hip+hop"];
        const pagesPerGenre = 1;
        const excludedTags = ["trance", "metal", "dubstep", "death+metal", "acid"];

        const scrapedData = await scrapeTracksForGenres(genres, pagesPerGenre, excludedTags);
        const token = await getSpotifyAccessToken();

        // Récup des playlists
        let userPlaylists;
        try {
          userPlaylists = await getAllUserPlaylists(token);
        } catch (err) {
          sendEvent({ error: err.message });
          return;
        }

        for (const genre of genres) {
          // ...
          // (logique inchangée : on recherche track, on crée/maj la playlist, on trim)
          // ...
          sendEvent({ message: `Scraping terminé pour le genre ${genre}.` });
          await delay(5000);
        }
        sendEvent({ message: "Mise à jour Spotify via scraping terminée." });
      },

      // SSE : /sync (global)
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
          // ...
          // (logique inchangée : create sync file, sync playlist, delay)
          // ...
          count++;
        }
        sendEvent({ message: "Toutes les playlists ont été synchronisées avec succès !" });
      },

      // SSE : /sync/:playlistId
      async spotifySyncIndividual(req, sendEvent, playlistId) {
        await verifyAdmin(req);
        sendEvent({ message: `Début de la synchronisation pour la playlist ${playlistId}` });

        await createCookieFile(sendEvent);
        await ensureDirectoryExists("/root/.spotdl/temp");
        const token = await getSpotifyAccessToken();

        // Chercher la playlist correspondante
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

        // ...
        // (logique inchangée : syncFile, run syncPlaylistFile, chmod)
        // ...
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

      // SSE /scrape
      "GET:/api/live/spotify/scrape": () => new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifyScrape(req, sendEvent)), 
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
          }
        }
      ),

      // SSE /sync
      "GET:/api/live/spotify/sync": () => new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifySync(req, sendEvent)),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
          }
        }
      ),
    };

    // Route SSE : /sync/:playlistId
    if (routeKey.startsWith("GET:/api/live/spotify/sync/")) {
      const playlistId = url.pathname.split("/").pop();
      return new Response(
        createSSEStream((sendEvent) => spotifyHandlers.spotifySyncIndividual(req, sendEvent, playlistId)),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
          }
        }
      );
    }

    if (localRouteMap[routeKey]) {
      return await localRouteMap[routeKey]();
    }

    // 404
    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
});
