// src/services/trackService.js

import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

/**
 * Supprime un morceau liké pour l'utilisateur connecté.
 * Étapes :
 * 1. Validation de l'ID passé en paramètre.
 * 2. Vérification que le morceau existe et appartient à l'utilisateur.
 * 3. Suppression du morceau et retour d'une réponse adéquate.
 *
 * @param {Object} ctx - Contexte de la requête (contenant ctx.params.id et ctx.user).
 * @returns {Response} Réponse JSON indiquant le succès ou l'erreur.
 */
export async function unlikeTrack(ctx) {
  // Récupérer l'utilisateur à partir du contexte
  const user = ctx.user;
  if (!user) return createError('Utilisateur non authentifié', 401);

  // Extraire et valider l'ID du morceau à supprimer
  const trackId = Number(ctx.params.id);
  if (!trackId) return createError('ID invalide', 400);

  try {
    // Étape 1 : Vérifier si le morceau existe et appartient à l'utilisateur
    const existingTracks = await db
      .select()
      .from(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .limit(1);

    if (existingTracks.length === 0) {
      return createError('Morceau introuvable ou non associé à cet utilisateur', 404);
    }

    // Étape 2 : Supprimer le morceau
    const deletedTracks = await db
      .delete(schema.likedTracks)
      .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
      .returning(); // Retourne le ou les enregistrements supprimés

    // Si la suppression n'a pas renvoyé de résultat, on considère que la suppression a échoué
    if (!deletedTracks || deletedTracks.length === 0) {
      return createError('Échec de la suppression du morceau', 500);
    }

    return jsonResponse({ message: 'Morceau retiré des favoris' });
  } catch (err) {
    console.error('[UnlikeTrack Error]', err);
    return createError('Erreur serveur lors de la suppression du morceau liké', 500);
  }
}
