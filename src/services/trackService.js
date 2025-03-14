import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

export async function likeTrack(ctx) {
  const user = ctx.user;
  const { title, artist, artwork, youtubeUrl } = ctx.body;

  try {
    const alreadyLiked = await db
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

    if (alreadyLiked) {
      return createError('Déjà liké', 400);
    }

    const [likedTrack] = await db
      .insert(schema.likedTracks)
      .values({ title, artist, artwork, youtubeUrl, userId: user.id })
      .returning();

    return jsonResponse({ message: 'Morceau liké', likedTrack }, 201);
  } catch (err) {
    return createError('Erreur serveur lors du like', 500);
  }
}

export async function getLikedTracks(ctx) {
  const user = ctx.user;

  try {
    const likedTracks = await db
      .select()
      .from(schema.likedTracks)
      .where(eq(schema.likedTracks.userId, user.id));

    return jsonResponse({ likedTracks }, 200);
  } catch (err) {
    return createError('Erreur serveur lors de la récupération des morceaux', 500);
  }
}

export async function unlikeTrack(ctx) {
  const user = ctx.user;
  const trackId = parseInt(ctx.params.id);

  try {
    const track = await db
      .select()
      .from(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .then(r => r[0]);

    if (!track) {
      return createError('Morceau introuvable', 404);
    }

    await db.delete(schema.likedTracks).where(eq(schema.likedTracks.id, trackId));

    return jsonResponse({ message: 'Morceau retiré' });
  } catch (err) {
    return createError('Erreur serveur lors du unlike', 500);
  }
}
