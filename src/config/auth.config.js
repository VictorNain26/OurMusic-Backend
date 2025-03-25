import { BetterAuth } from 'better-auth';
import { Elysia } from 'elysia';

import { db } from '../db.js';
import { user, session, account, verification } from '../db/schema.js';
import { env } from './env.js';

export const auth = BetterAuth({
  secret: env.BETTER_AUTH_SECRET,
  db,
  schema: {
    user,
    session,
    account,
    verification,
  },
});

// Plugin Elysia encapsulant Better Auth + macro d’authentification
export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
  auth: {
    async resolve({ error, request: { headers } }) {
      const session = await auth.api.getSession({ headers });
      if (!session) return error(401, 'Non authentifié');

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});
