import { Context } from 'elysia';
import { auth } from './auth.js';

const betterAuthView = context => {
  const ACCEPTED = ['POST', 'GET'];
  if (ACCEPTED.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.set.status = 405;
    return new Response('Méthode non autorisée', { status: 405 });
  }
};

export default betterAuthView;
