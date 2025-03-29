// src/libs/auth/auth-view.ts
import { Context } from 'elysia';
import { auth } from './auth.ts';

const betterAuthView = (context: Context) => {
  const methods = ['POST', 'GET'];

  if (methods.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.set.status = 405;
    return { error: 'Méthode non autorisée' };
  }
};

export default betterAuthView;
