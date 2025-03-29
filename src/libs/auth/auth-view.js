import { auth } from './auth.js';

function betterAuthView(ctx) {
  const methods = ['GET', 'POST'];
  if (methods.includes(ctx.request.method)) {
    return auth.handler(ctx.request);
  } else {
    ctx.set.status = 405;
    return { error: 'Méthode non autorisée' };
  }
}

export default betterAuthView;
