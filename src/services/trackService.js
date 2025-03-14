// src/services/trackService.js

import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

/**
 * Like un morceau pour l'utilisateur connecté.
 * Vérifie d'abord si le morceau est déjà liké afin d'éviter la duplication.
 *
 * @param {Object} ctx - Contexte de la requête contenant ctx.body et ctx.user.
 * @returns {Response} Réponse JSON indiquant le succès ou l'erreur.
 */
export async function likeTrack(ctx) {
  const user = ctx.user;
  const { title, artist, artwork, youtubeUrl } = ctx.body;

  try {
    // Vérifier si le morceau est déjà liké par l'utilisateur
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

    // Insérer le morceau liké
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

/**
 * Récupère la liste des morceaux likés pour l'utilisateur connecté.
 *
 * @param {Object} ctx - Contexte de la requête contenant ctx.user.
 * @returns {Response} Réponse JSON avec la liste des morceaux likés ou une erreur.
 */
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

/**
 * Supprime un morceau liké pour l'utilisateur connecté.
 * Valide l'ID et vérifie que le morceau appartient à l'utilisateur avant suppression.
 *
 * @param {Object} ctx - Contexte de la requête contenant ctx.params.id et ctx.user.
 * @returns {Response} Réponse JSON indiquant le succès ou l'erreur.
 */
export async function unlikeTrack(ctx) {
  const user = ctx.user;
  if (!user) return createError('Utilisateur non authentifié', 401);

  const trackId = Number(ctx.params.id);
  if (!trackId) return createError('ID invalide', 400);

  try {
    // Vérifier si le morceau existe et appartient à l'utilisateur
    const existingTracks = await db
      .select()
      .from(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .limit(1);

    if (existingTracks.length === 0) {
      return createError('Morceau introuvable ou non associé à cet utilisateur', 404);
    }

    // Supprimer le morceau
    const deletedTracks = await db
      .delete(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .returning();

    if (!deletedTracks || deletedTracks.length === 0) {
      return createError('Échec de la suppression du morceau', 500);
    }

    return jsonResponse({ message: 'Morceau retiré des favoris' });
  } catch (err) {
    console.error('[UnlikeTrack Error]', err);
    return createError('Erreur serveur lors de la suppression du morceau liké', 500);
  }
}
