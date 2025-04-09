import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * ✅ Like un morceau pour un utilisateur donné
 */
export async function likeTrack(ctx) {
  const { user, body } = ctx;
  const { title, artist, artwork, youtubeUrl } = body;

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
      return { status: 400, error: 'Déjà liké' };
    }

    const [likedTrack] = await db
      .insert(schema.likedTracks)
      .values({ title, artist, artwork, youtubeUrl, userId: user.id })
      .returning();

    return {
      status: 201,
      message: 'Morceau liké',
      likedTrack,
    };
  } catch (err) {
    console.error('[TrackService → likeTrack]', err);
    return { status: 500, error: 'Erreur serveur lors du like' };
  }
}

/**
 * ✅ Récupère les morceaux likés de l’utilisateur connecté
 */
export async function getLikedTracks(ctx) {
  const { user } = ctx;

  try {
    const likedTracks = await db
      .select()
      .from(schema.likedTracks)
      .where(eq(schema.likedTracks.userId, user.id));

    return { likedTracks };
  } catch (err) {
    console.error('[TrackService → getLikedTracks]', err);
    return { status: 500, error: 'Erreur serveur lors de la récupération des morceaux' };
  }
}

/**
 * ✅ Supprime un morceau liké (unlike) pour l’utilisateur connecté
 */
export async function unlikeTrack(ctx) {
  const { user, id: trackId } = ctx;

  if (!user) return { status: 401, error: 'Utilisateur non authentifié' };
  if (!trackId || typeof trackId !== 'string') return { status: 400, error: 'ID invalide' };

  try {
    const existingTrack = await db
      .select()
      .from(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .limit(1)
      .then(res => res[0]);

    if (!existingTrack) {
      return { status: 404, error: 'Morceau introuvable ou non associé à cet utilisateur' };
    }

    await db
      .delete(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)));

    return { message: 'Morceau retiré des favoris', trackId };
  } catch (err) {
    console.error('[TrackService → unlikeTrack]', err);
    return { status: 500, error: 'Erreur serveur lors de la suppression du morceau liké' };
  }
}
