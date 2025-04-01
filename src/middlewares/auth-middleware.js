import { auth } from '../../utils/auth/auth';

export const userMiddleware = async () => {
  const session = await auth.api.getSession({ headers: c.request.headers });

  if (!session) {
    c.set.status = 401;
    return { success: 'error', message: 'Accès non autorisé : token manquant' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};
