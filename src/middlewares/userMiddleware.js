import { auth } from '../lib/auth/auth.js';

/**
 * Middleware Elysia qui vérifie la session Better Auth
 */
export const userMiddleware = async ctx => {
  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    ctx.set.status = 401;
    return { success: 'error', message: 'Unauthorized: token missing or invalid' };
  }

  // On retourne un objet => ctx disposera de ctx.user et ctx.session
  return {
    user: session.user,
    session: session.session,
  };
};

/**
 * Exemple d’helper pour renvoyer l’état user/session
 */
export const userInfo = (user, session) => ({
  user,
  session,
});
