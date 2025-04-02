import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../../db/index.js';
import { user, session, verification, account } from '../../db/schema.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      verification,
      account,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  onSignUp(ctx) {
    console.log(`🆕 Nouvel utilisateur inscrit : ${ctx.user.email}`);
  },

  onLogin(ctx) {
    console.log(`✅ Connexion : ${ctx.user.email}`);
  },

  onLogout(ctx) {
    console.log(`👋 Déconnexion : ${ctx.user.email}`);
  },
});
