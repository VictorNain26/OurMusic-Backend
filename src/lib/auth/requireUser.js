import { auth } from './index.js';

export async function requireUser(ctx) {
  try {
    const sessionData = await auth.api.getSession({ headers: ctx.request.headers });

    if (!sessionData?.user) {
      return { error: '⛔ Non connecté', status: 401 };
    }

    ctx.user = sessionData.user;
    ctx.session = sessionData.session;

    return null;
  } catch (err) {
    console.error('[requireUser Error]', err);
    return { error: '❌ Erreur serveur auth', status: 500 };
  }
}
