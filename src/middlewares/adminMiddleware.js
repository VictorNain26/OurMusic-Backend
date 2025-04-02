import { auth } from '../lib/auth/auth.js';

/**
 * Middleware qui vérifie si l'utilisateur est connecté
 * et possède le rôle `admin`. Refuse l'accès sinon.
 */
export const adminMiddleware = async ctx => {
  try {
    const session = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    if (!session || session.user?.role !== 'admin') {
      ctx.set.status = 403;
      return {
        success: 'error',
        message: '⛔ Accès interdit : admin uniquement',
      };
    }

    return {
      user: session.user,
      session: session.session,
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
