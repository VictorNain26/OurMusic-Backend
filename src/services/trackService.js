import { LikedTrack } from '../db.js';
import { verifyAccessToken } from '../middlewares/auth.js';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../utils/helpers.js';

export async function likeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const { title, artist, artwork, youtubeUrl } = await req.json();
  if (!title || !artist || !artwork || !youtubeUrl)
    return errorResponse('Champs requis manquants', 400, headers);
  const exists = await LikedTrack.findOne({ where: { UserId: user.id, title, artist } });
  if (exists) return errorResponse('Déjà liké', 400, headers);
  const likedTrack = await LikedTrack.create({
    title,
    artist,
    artwork,
    youtubeUrl,
    UserId: user.id,
  });
  return jsonResponse({ message: 'Morceau liké', likedTrack }, 201, headers);
}

export async function getLikedTracks(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const likedTracks = await LikedTrack.findAll({ where: { UserId: user.id } });
  return jsonResponse({ likedTracks }, 200, headers);
}

export async function unlikeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const id = req.url.split('/').pop();
  const track = await LikedTrack.findOne({ where: { id, UserId: user.id } });
  if (!track) return errorResponse('Morceau introuvable', 404, headers);
  await track.destroy();
  return jsonResponse({ message: 'Morceau retiré' }, 200, headers);
}
