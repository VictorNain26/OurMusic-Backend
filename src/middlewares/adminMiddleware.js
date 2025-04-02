import { auth } from '../lib/auth/index.js';

/**
 * Middleware Elysia pour vérifier si l'utilisateur est admin
 */
export const adminMiddleware = async ctx => {
  try {
    const sessionData = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    if (!sessionData?.user) {
      ctx.set.status = 401;
      return {
        success: 'error',
        message: '⛔ Accès non autorisé (non connecté)',
      };
    }

    if (sessionData.user.role !== 'admin') {
      ctx.set.status = 403;
      return {
        success: 'error',
        message: '⛔ Accès interdit : admin uniquement',
      };
    }

    return {
      user: sessionData.user,
      session: sessionData.session,
    };
  } catch (error) {
    console.error('[adminMiddleware Error]', error);
    ctx.set.status = 500;
    return {
      success: 'error',
      message: '❌ Erreur serveur pendant la vérification admin',
    };
  }
};
