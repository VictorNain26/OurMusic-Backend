import { auth } from './index.js';

export async function requireUser(ctx) {
  try {
    const sessionData = await auth.api.getSession({ headers: ctx.request.headers });

    if (!sessionData?.user) {
      return new Response(JSON.stringify({ error: '⛔ Non connecté' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.user = sessionData.user;
    ctx.session = sessionData.session;
  } catch (err) {
    console.error('[requireUser Error]', err);
    return new Response(JSON.stringify({ error: '❌ Erreur serveur auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
