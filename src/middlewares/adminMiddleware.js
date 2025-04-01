import { auth } from '../lib/auth/auth.js';

export const adminMiddleware = async ctx => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session || session.user?.role !== 'admin') {
    ctx.set.status = 403;
    return {
      success: 'error',
      message: 'Forbidden: admin only',
    };
  }
  return {
    user: session.user,
    session: session.session,
  };
};
