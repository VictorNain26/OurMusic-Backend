import { likeTrack, getLikedTracks } from "../services/trackService.js";

export const trackRoutes = {
  "POST:/api/track/like": (req, headers) => likeTrack(req, headers),
  "GET:/api/track/like": (req, headers) => getLikedTracks(req, headers),
};