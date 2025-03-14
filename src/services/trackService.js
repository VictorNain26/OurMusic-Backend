import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

export async function likeTrack(ctx) {
  const user = ctx.user;
  const { title, artist, artwork, youtubeUrl } = ctx.body;

  try {
    const existingTrack = await db
      .select()
      .from(schema.likedTracks)
      .where(
        and(
          eq(schema.likedTracks.userId, user.id),
          eq(schema.likedTracks.title, title),
          eq(schema.likedTracks.artist, artist)
        )
      )
      .limit(1)
      .then(res => res[0]);

    if (existingTrack) {
      return createError('Déjà liké', 400);
    }

    const [likedTrack] = await db
      .insert(schema.likedTracks)
      .values({ title, artist, artwork, youtubeUrl, userId: user.id })
      .returning();

    return jsonResponse({ message: 'Morceau liké', likedTrack }, 201);
  } catch (err) {
    console.error('[LikeTrack Error]', err);
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
    console.error('[GetLikedTracks Error]', err);
    return createError('Erreur serveur lors de la récupération des morceaux', 500);
  }
}

export async function unlikeTrack(ctx) {
  const user = ctx.user;
  const trackId = ctx.id;

  console.log('[Service DELETE] id reçu =', trackId);

  if (!user) return createError('Utilisateur non authentifié', 401);
  if (!trackId || isNaN(trackId)) return createError('ID invalide', 400);

  try {
    const existingTrack = await db
      .select()
      .from(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .limit(1)
      .then(res => res[0]);

    if (!existingTrack) {
      return createError('Morceau introuvable ou non associé à cet utilisateur', 404);
    }

    await db
      .delete(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)));

    return jsonResponse({ message: 'Morceau retiré des favoris', trackId });
  } catch (err) {
    console.error('[UnlikeTrack Error]', err);
    return createError('Erreur serveur lors de la suppression du morceau liké', 500);
  }
}
