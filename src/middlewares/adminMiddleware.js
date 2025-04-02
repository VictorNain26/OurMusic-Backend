import { auth } from '../lib/auth/index.js';

/**
 * Middleware Elysia pour restreindre l’accès aux admins uniquement
 */
export const adminMiddleware = async ctx => {
  try {
    const sessionData = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    const user = sessionData?.user;

    if (!user) {
      ctx.set.status = 401;
      return { success: 'error', message: '⛔ Non connecté' };
    }

    if (user.role !== 'admin') {
      ctx.set.status = 403;
      return { success: 'error', message: '⛔ Accès interdit : admin uniquement' };
    }

    return {
      user,
      session: sessionData.session,
    };
  } catch (err) {
    console.error('[adminMiddleware Error]', err);
    ctx.set.status = 500;
    return { success: 'error', message: '❌ Erreur serveur auth' };
  }
};
