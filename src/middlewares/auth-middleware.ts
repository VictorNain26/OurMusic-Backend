// src/middlewares/auth-middleware.ts
import { Context } from 'elysia';
import { auth } from '../libs/auth/auth.ts';

export const userMiddleware = async (context: Context) => {
  const session = await auth.api.getSession({ headers: context.request.headers });

  if (!session) {
    context.set.status = 401;
    return { success: 'error', message: 'Accès non autorisé' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};
