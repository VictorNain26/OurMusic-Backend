import { createError } from '../lib/response.js';

// ✅ Vérifie si l'utilisateur est authentifié
export async function requireAuth(ctx) {
  if (!ctx.user) {
    return createError('Non authentifié', 401);
  }
  return true;
}

// ✅ Vérifie que l'utilisateur a un rôle administrateur
export async function requireAdmin(ctx) {
  const auth = await requireAuth(ctx);
  if (auth !== true) return auth;

  if (ctx.user.role !== 'admin') {
    return createError('Accès refusé : administrateur requis', 403);
  }

  return true;
}
