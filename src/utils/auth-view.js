import { Context } from 'elysia';
import { auth } from './auth.js';

const betterAuthView = context => {
  const ALLOWED_METHODS = ['POST', 'GET'];

  if (ALLOWED_METHODS.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.set.status = 405;
    return { error: 'Méthode non autorisée' };
  }
};

export default betterAuthView;
