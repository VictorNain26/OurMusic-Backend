import { auth } from '../utils/auth/auth.js';

export const userMiddleware = async ctx => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });

  if (!session) {
    ctx.set.status = 401;
    return { success: 'error', message: 'Non authentifié' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};

export async function requireAuth(ctx) {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session || !session.user) {
    ctx.set.status = 401;
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  ctx.user = session.user;
  return true;
}

export async function requireAdmin(ctx) {
  const result = await requireAuth(ctx);
  if (result !== true) return result;

  if (ctx.user?.role !== 'admin') {
    ctx.set.status = 403;
    return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return true;
}
