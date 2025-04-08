import { auth } from './index.js';

export async function betterAuthView(ctx) {
  const allowedMethods = ['POST', 'GET'];

  if (!allowedMethods.includes(ctx.request.method)) {
    ctx.set.status = 405;
    return { error: 'Méthode non autorisée' };
  }

  try {
    const response = await auth.handler(ctx.request);
    return response;
  } catch (error) {
    console.error('[betterAuthView Error]', error);
    ctx.set.status = 500;
    return { error: 'Erreur interne du serveur Better Auth' };
  }
}
