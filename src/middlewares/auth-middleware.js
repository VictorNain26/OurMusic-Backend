import { auth } from '../utils/auth/auth.js';

export const userMiddleware = async ctx => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });

  if (!session) {
    ctx.set.status = 401;
    return { success: 'error', message: 'Unauthorized Access' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};

export const userInfo = (user, session) => ({ user, session });
