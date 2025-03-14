import { safeParse } from 'valibot';
import { createError } from './response.js';

/**
 * Valide un schéma Valibot et retourne un output ou une réponse d'erreur.
 * @param {any} schema - Schéma Valibot
 * @param {any} body - Corps de la requête à valider
 * @returns {object|Response}
 */
export function validateBody(schema, body) {
  const result = safeParse(schema, body);

  if (!result.success) {
    const message = result.issues.map(i => i.message).join(', ');
    return createError(message, 400);
  }

  return result.output;
}
