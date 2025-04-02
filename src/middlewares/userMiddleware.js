import { auth } from '../lib/auth/auth.js';

/**
 * Middleware Elysia qui vérifie la session Better Auth
 * et injecte l'utilisateur et la session dans le contexte
 */
export const userMiddleware = async ctx => {
  try {
    const session = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    if (!session) {
      ctx.set.status = 401;
      return {
        success: 'error',
        message: '⛔ Accès non autorisé (session manquante)',
      };
    }

    return {
      user: session.user,
      session: session.session,
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
 * Helper pour retourner uniquement les infos d’un utilisateur
 */
export const userInfo = (user, session) => ({
  user,
  session,
});
