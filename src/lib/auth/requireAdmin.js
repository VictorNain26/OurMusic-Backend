import { auth } from './index.js';

export async function requireAdmin(ctx) {
  try {
    const sessionData = await auth.api.getSession({ headers: ctx.request.headers });

    if (!sessionData?.user) {
      return { error: '⛔ Non connecté', status: 401 };
    }

    if (sessionData.user.role !== 'admin') {
      return { error: '⛔ Accès interdit : admin uniquement', status: 403 };
    }

    ctx.user = sessionData.user;
    ctx.session = sessionData.session;

    return null;
  } catch (err) {
    console.error('[requireAdmin Error]', err);
    return { error: '❌ Erreur serveur auth', status: 500 };
  }
}
