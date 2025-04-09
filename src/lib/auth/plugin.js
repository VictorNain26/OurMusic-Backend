import { auth } from './index.js';

export function withAuthPlugin() {
  return {
    async beforeHandle(ctx) {
      try {
        const sessionData = await auth.api.getSession({ headers: ctx.request.headers });

        if (sessionData?.user) {
          ctx.user = sessionData.user;
          ctx.session = sessionData.session;
        }
      } catch (err) {
        console.error('[withAuthPlugin Error]', err);
      }
    },
  };
}
