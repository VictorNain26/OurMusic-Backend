import { createError } from '../lib/response.js';

export async function requireAuth(ctx) {
  if (!ctx.user) return createError('Non authentifié', 401);
  return true;
}

export async function requireAdmin(ctx) {
  const auth = await requireAuth(ctx);
  if (auth !== true) return auth;

  if (ctx.user.role !== 'admin') {
    return createError('Accès refusé : admin requis', 403);
  }

  return true;
}
