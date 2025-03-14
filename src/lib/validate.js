import { safeParse } from 'valibot';
import { createError } from './response.js';

/**
 * Valide un schéma Valibot et retourne l'objet validé ou une réponse d'erreur.
 * @param {object} schema - Schéma Valibot
 * @param {object} body - Corps de la requête à valider
 * @returns {object|Response}
 */
export function validateBody(schema, body) {
  const result = safeParse(schema, body);

  if (!result.success) {
    const message = result.issues.map(issue => issue.message).join(', ');
    return createError(message, 400);
  }

  return result.output;
}
