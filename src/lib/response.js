// Réponses JSON homogènes et simplifiées
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Crée une réponse d'erreur JSON standardisée
export function createError(message = 'Erreur serveur', status = 500) {
  return jsonResponse({ error: message }, status);
}
