import { auth } from '../utils/auth.js';

export const userMiddleware = async c => {
  const session = await auth.api.getSession({ headers: c.request.headers });

  if (!session) {
    c.set.status = 401;
    return { success: 'error', message: 'Unauthorized Access: Token is missing' };
  }

  return {
    user: session.user,
    session: session.session,
  };
};

export const userInfo = (user, session) => {
  return {
    user,
    session,
  };
};
