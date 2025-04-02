import { auth } from '../lib/auth/index.js';

/**
 * Middleware Elysia pour vérifier la session Better Auth
 * et injecter l'utilisateur et la session dans le contexte
 */
export const userMiddleware = async ctx => {
  try {
    const sessionData = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    if (!sessionData?.user) {
      ctx.set.status = 401;
      return {
        success: 'error',
        message: '⛔ Accès non autorisé (utilisateur non authentifié)',
      };
    }

    return {
      user: sessionData.user,
      session: sessionData.session,
    };
  } catch (error) {
    console.error('[userMiddleware Error]', error);
    ctx.set.status = 500;
    return {
      success: 'error',
      message: '❌ Erreur serveur pendant la vérification de session',
    };
  }
};

/**
 * Helper pour retourner les infos utilisateur + session
 */
export const userInfo = (user, session) => ({ user, session });
