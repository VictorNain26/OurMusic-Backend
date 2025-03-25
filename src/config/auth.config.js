import { BetterAuth } from 'better-auth';
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
  globalAuth: {
    async resolve({ request, error }) {
      const session = await this.getSession({ headers: request.headers });
      if (!session) return error(401, 'Non authentifié');
      return session.user;
    },
  },
});
