import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { user, session, verification, account } from '../../db/schema.js';
import { sendBetterAuthEmail } from './sendBetterAuthEmail.js';

export const auth = betterAuth({
  url: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  cookies: {
    secure: env.FRONTEND_BASE_URL?.startsWith('https://'),
  },

  plugins: [admin()],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }, request) => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🔒 Réinitialisez votre mot de passe',
        preheader: 'Réinitialisez votre mot de passe pour continuer à profiter de OurMusic 🔒',
        buttonLink: url,
        buttonText: 'Réinitialiser mon mot de passe',
        isResetPassword: true,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }, request) => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🎉 Confirmez votre adresse email',
        preheader: 'Confirmez votre adresse email pour activer votre compte 🎶',
        buttonLink: url,
        buttonText: 'Vérifier mon email',
        isVerificationEmail: true,
      });
    },
  },

  onSignUp(ctx) {
    console.log(`🆕 Nouvel utilisateur inscrit : ${ctx.user.email}`);
  },

  onLogin(ctx) {
    console.log(`✅ Connexion réussie : ${ctx.user.email}`);
  },

  onLogout(ctx) {
    console.log(`👋 Déconnexion : ${ctx.user.email}`);
  },
});
