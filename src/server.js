// ✅ server.js (version finale complète et corrigée)
import { getCorsHeaders } from "./utils/cors.js";
import { authRoutes } from "./routes/authRoutes.js";
import { trackRoutes } from "./routes/trackRoutes.js";
import { spotifyRoutes, isSyncPlaylistIdRoute, handleSyncPlaylistIdRoute } from "./routes/spotifyRoutes.js";
import { initDatabase } from "./db.js";

await initDatabase();

const port = Number(Bun.env.PORT) || 3000;

Bun.serve({
  port,
  idleTimeout: 0,
  async fetch(req) {
    const corsHeaders = getCorsHeaders(req);
    const url = new URL(req.url);
    const routeKey = `${req.method}:${url.pathname}`;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Routage dynamique pour DELETE /api/track/like/:id (RESTful pattern)
    if (req.method === "DELETE" && url.pathname.startsWith("/api/track/like/")) {
      const { unlikeTrack } = await import("./services/trackService.js");
      return unlikeTrack(req, corsHeaders);
    }

    // Mapping global des routes
    const allRoutes = {
      ...authRoutes,
      ...trackRoutes,
      ...spotifyRoutes,
    };

    // Cas particulier : /api/live/spotify/sync/:playlistId
    if (isSyncPlaylistIdRoute(routeKey)) {
      return handleSyncPlaylistIdRoute(req, corsHeaders);
    }

    // Handler principal
    const handler = allRoutes[routeKey];
    return handler
      ? await handler(req, corsHeaders)
      : new Response("Not found", { status: 404, headers: corsHeaders });
  },
});
