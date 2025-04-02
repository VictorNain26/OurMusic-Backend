import { auth } from './index.js';

export async function requireAdmin(ctx) {
  try {
    const sessionData = await auth.api.getSession({ headers: ctx.request.headers });

    if (!sessionData?.user) {
      return new Response(JSON.stringify({ error: '⛔ Non connecté' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (sessionData.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: '⛔ Accès interdit : admin uniquement' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.user = sessionData.user;
    ctx.session = sessionData.session;
  } catch (err) {
    console.error('[requireAdmin Error]', err);
    return new Response(JSON.stringify({ error: '❌ Erreur serveur auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
