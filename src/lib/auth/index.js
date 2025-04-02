import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { user, session, verification, account } from '../../db/schema.js';

export const auth = betterAuth({
  url: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

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
    verificationRequired: true,
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  cookies: {
    secure: env.FRONTEND_BASE_URL?.startsWith('https://'),
  },

  plugins: [admin()],

  onSignUp(ctx) {
    console.log(`🆕 Nouvel utilisateur : ${ctx.user.email}`);
  },

  onLogin(ctx) {
    console.log(`✅ Connexion : ${ctx.user.email}`);
  },

  onLogout(ctx) {
    console.log(`👋 Déconnexion : ${ctx.user.email}`);
  },
});
