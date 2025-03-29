import { auth } from '../libs/auth/auth.js';

export const userMiddleware = async () => {
  // Récupère la session depuis l'en-tête
  const session = await auth.api.getSession({ headers: context.request.headers });

  // Si pas de session -> 401
  if (!session) {
    context.set.status = 401;
    return { success: 'error', message: 'Non authentifié' };
  }

  // Retourne l'objet { user, session }
  return {
    user: session.user,
    session: session.session,
  };
};
