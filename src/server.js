// ✅ server.js (refactor principal)
import { getCorsHeaders } from "./utils/cors.js";
import { authRoutes } from "./routes/authRoutes.js";
import { trackRoutes } from "./routes/trackRoutes.js";
import { spotifyRoutes, isSyncPlaylistIdRoute, handleSyncPlaylistIdRoute } from "./routes/spotifyRoutes.js";
import { initDatabase } from "./db.js";

await initDatabase();

const port = Number(Bun.env.PORT) || 3000;

Bun.serve({
  port,
  async fetch(req) {
    const corsHeaders = getCorsHeaders(req);
    const url = new URL(req.url);
    const routeKey = `${req.method}:${url.pathname}`;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const allRoutes = {
      ...authRoutes,
      ...trackRoutes,
      ...spotifyRoutes,
    };

    if (isSyncPlaylistIdRoute(routeKey)) {
      return handleSyncPlaylistIdRoute(req, corsHeaders);
    }

    const handler = allRoutes[routeKey];
    return handler
      ? await handler(req, corsHeaders)
      : new Response("Not found", { status: 404, headers: corsHeaders });
  },
});
