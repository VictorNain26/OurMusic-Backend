import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';

import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { user, session, verification, account } from '../../db/schema.js';
import { sendBetterAuthEmail } from './sendBetterAuthEmail.js';

const isProd = process.env.ENV === 'production';

export const auth = betterAuth({
  url: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  trustedOrigins: env.ALLOWED_ORIGINS,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  cookies: {
    secure: isProd,
  },

  advanced: {
    useSecureCookies: isProd,
    crossSubDomainCookies: isProd
      ? {
          enabled: true,
          domain: 'ourmusic-api.ovh',
        }
      : undefined,
    defaultCookieAttributes: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      partitioned: isProd ? true : false,
    },
  },

  cors: {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    optionsSuccessStatus: 200,
  },

  plugins: [admin()],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }) => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🔒 Réinitialisez votre mot de passe',
        preheader: 'Réinitialisez votre mot de passe pour continuer à profiter de OurMusic 🔒',
        buttonLink: url,
        buttonText: 'Réinitialiser mon mot de passe',
        isResetPassword: true,
      });
    },

    onResetPassword: async ctx => {
      const redirectUrl = `${env.FRONTEND_BASE_URL}?password_reset=success`;
      return ctx.redirect(redirectUrl);
    },

    resetPassword: {
      callbackUrl: env.FRONTEND_BASE_URL,
    },
  },

  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,

    sendVerificationEmail: async ({ user, url }) => {
      await sendBetterAuthEmail({
        to: user.email,
        subject: '🎉 Confirmez votre adresse email',
        preheader: 'Confirmez votre adresse email pour activer votre compte 🎶',
        buttonLink: url,
        buttonText: 'Vérifier mon email',
        isVerificationEmail: true,
      });
    },

    onVerified: async ctx => {
      const redirectUrl = `${env.FRONTEND_BASE_URL}?email_verified=success`;
      return ctx.redirect(redirectUrl);
    },

    verification: {
      callbackUrl: env.FRONTEND_BASE_URL,
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
  