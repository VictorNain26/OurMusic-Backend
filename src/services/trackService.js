import { LikedTrack } from '../db.js';
import { verifyAccessToken } from '../middlewares/verifyAccessToken.js';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../utils/response.js';

export async function likeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);

  const { title, artist, artwork, youtubeUrl } = await req.json();
  if (!title || !artist || !artwork || !youtubeUrl) {
    return errorResponse(
      'Tous les champs (title, artist, artwork, youtubeUrl) sont requis',
      400,
      headers
    );
  }

  const existing = await LikedTrack.findOne({ where: { UserId: user.id, title, artist } });
  if (existing) return errorResponse('Ce morceau est déjà liké', 400, headers);

  try {
    const likedTrack = await LikedTrack.create({
      title,
      artist,
      artwork,
      youtubeUrl,
      UserId: user.id,
    });
    return jsonResponse({ message: 'Morceau liké', likedTrack }, 201, headers);
  } catch (err) {
    return errorResponse(err.message, 500, headers);
  }
}

export async function getLikedTracks(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);

  try {
    const likedTracks = await LikedTrack.findAll({ where: { UserId: user.id } });
    return jsonResponse({ likedTracks }, 200, headers);
  } catch (err) {
    return errorResponse(err.message, 500, headers);
  }
}

export async function unlikeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);

  const id = req.url.split('/').pop();
  const track = await LikedTrack.findOne({ where: { id, UserId: user.id } });
  if (!track) return errorResponse('Morceau non trouvé', 404, headers);

  try {
    await track.destroy();
    return jsonResponse({ message: 'Morceau retiré des likes' }, 200, headers);
  } catch (err) {
    return errorResponse(err.message, 500, headers);
  }
}
