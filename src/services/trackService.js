import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '../middlewares/auth.js';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../utils/helpers.js';

export async function likeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const { title, artist, artwork, youtubeUrl } = await req.json();
  if (!title || !artist || !artwork || !youtubeUrl)
    return errorResponse('Champs requis manquants', 400, headers);
  const exists = await db
    .select()
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist)
      )
    )
    .then(r => r[0]);
  if (exists) return errorResponse('Déjà liké', 400, headers);
  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({ title, artist, artwork, youtubeUrl, userId: user.id })
    .returning();
  return jsonResponse({ message: 'Morceau liké', likedTrack }, 201, headers);
}

export async function getLikedTracks(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const likedTracks = await db
    .select()
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id));
  return jsonResponse({ likedTracks }, 200, headers);
}

export async function unlikeTrack(req, headers) {
  const user = await verifyAccessToken(req);
  if (!user) return unauthorizedResponse(headers);
  const id = parseInt(req.url.split('/').pop());
  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(and(eq(schema.likedTracks.id, id), eq(schema.likedTracks.userId, user.id)))
    .then(r => r[0]);
  if (!track) return errorResponse('Morceau introuvable', 404, headers);
  await db.delete(schema.likedTracks).where(eq(schema.likedTracks.id, id));
  return jsonResponse({ message: 'Morceau retiré' }, 200, headers);
}
