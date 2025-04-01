import { auth } from '../utils/auth/auth.js';

export const authMiddleware = async ctx => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });

  if (!session) {
    ctx.set.status = 401;
    return { error: 'Non autorisé : session invalide' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};
