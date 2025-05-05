// src/lib/auth/index.js
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

  // Auth par email / mot de passe
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
      return ctx.redirect(`${env.FRONTEND_BASE_URL}?password_reset=success`);
    },
  },

  session: {
    include: {
      account: true,
    },
  },

  // Vérification de l'email
  emailVerification: {
    sendOnSignUp: true,
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
      return ctx.redirect(`${env.FRONTEND_BASE_URL}?email_verified=success`);
    },
  },

  // 🔗 Authentification Spotify native
  /* ──────────────── Account Linking ──────────────── */
  account: {
    accountLinking: {
      enabled: true, // autorise le “link”
      trustedProviders: ['spotify'],
      updateAccountOnSignIn: true, // rafraîchit les tokens si on se relog
    },
  },
  /* ──────────────── Social providers ──────────────── */
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      scopes: ['user-read-email', 'playlist-modify-private', 'playlist-modify-public'],
      callbackUrl: `${env.BACKEND_BASE_URL}/api/auth/spotify/callback`,
    },
  },

  // Logs utiles
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
