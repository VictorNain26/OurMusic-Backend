import { Elysia } from 'elysia';
import { auth } from './index.js';

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
  auth: {
    async resolve({ error, request: { headers } }) {
      const session = await auth.api.getSession({ headers });

      if (!session) return error(401);

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});
