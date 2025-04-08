import { auth } from './index.js';

export async function userMiddleware(ctx) {
  const session = await auth.api.getSession({ headers: ctx.request.headers });

  if (!session) {
    ctx.set.status = 401;
    return { error: 'Non autorisé' };
  }

  return {
    user: session.user,
    session: session.session,
  };
}
