import { auth } from './index.js';

export async function betterAuthView(ctx) {
  const allowedMethods = ['POST', 'GET', 'OPTIONS'];

  if (!allowedMethods.includes(ctx.request.method)) {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await auth.handler(ctx.request);

    if (!response?.body) {
      return new Response(JSON.stringify({ session: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return response;
  } catch (error) {
    console.error('[betterAuthView Error]', error);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur Better Auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
