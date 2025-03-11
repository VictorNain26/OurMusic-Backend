import { spotifyScrape, spotifySyncAll, spotifySyncById } from "../services/spotifyService.js";
import { createSSEStream } from "../utils/sse.js";

export const spotifyRoutes = {
  "GET:/api/live/spotify/scrape": (req, headers) => new Response(
    createSSEStream((sendEvent) => spotifyScrape(req, sendEvent)),
    {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  ),

  "GET:/api/live/spotify/sync": (req, headers) => new Response(
    createSSEStream((sendEvent) => spotifySyncAll(req, sendEvent)),
    {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  ),
};

export const isSyncPlaylistIdRoute = (routeKey) => routeKey.startsWith("GET:/api/live/spotify/sync/");

export const handleSyncPlaylistIdRoute = (req, headers) => {
  const playlistId = new URL(req.url).pathname.split("/").pop();
  return new Response(
    createSSEStream((sendEvent) => spotifySyncById(req, sendEvent, playlistId)),
    {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
};