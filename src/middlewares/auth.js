export async function requireAuth(ctx) {
  if (!ctx.user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  }
  return true;
}

export async function requireAdmin(ctx) {
  const auth = await requireAuth(ctx);
  if (auth !== true) return auth;
  if (ctx.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Accès refusé : admin requis' }), { status: 403 });
  }
  return true;
}
