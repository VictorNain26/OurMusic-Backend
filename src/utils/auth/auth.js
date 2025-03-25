import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import nodemailer from 'nodemailer'; // <-- nouveau
import { db } from '../../db/index.js';
import { account, session, user, verification } from '../../db/schema.js';

// 1. Configurez votre service SMTP avec Nodemailer
//    (ex : Mailtrap, Gmail, etc.)
const transporter = nodemailer.createTransport({
  host: Bun.env.SMTP_HOST, // ex: "smtp.mailtrap.io"
  port: Bun.env.SMTP_PORT, // ex: 587
  secure: false, // ou true si TLS/SSL
  auth: {
    user: Bun.env.SMTP_USER, // ex: "123abcd"
    pass: Bun.env.SMTP_PASSWORD, // ex: "secret"
  },
});

export const auth = betterAuth({
  // Adaptateur Drizzle + PostgreSQL
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      verification,
      account,
    },
  }),

  // Secret pour chiffrer la session / JWT / etc.
  secret: Bun.env.BETTER_AUTH_SECRET,

  // Activation du login email+password
  emailAndPassword: {
    enabled: true,

    // 2. Activer la vérification d’email
    verifyEmail: {
      enabled: true,
      // Better Auth appellera sendEmail quand on doit envoyer le mail de vérif
      sendEmail: async (email, subject, html) => {
        await transporter.sendMail({
          from: 'noreply@votre-domaine.fr', // ou celui que vous voulez
          to: email,
          subject,
          html,
        });
      },
    },

    // 3. Activer le reset password
    resetPassword: {
      enabled: true,
      // Better Auth appellera sendEmail quand on doit envoyer le lien de reset
      sendEmail: async (email, subject, html) => {
        await transporter.sendMail({
          from: 'noreply@votre-domaine.fr',
          to: email,
          subject,
          html,
        });
      },
    },
  },

  // Social providers (ex. Google)
  socialProviders: {
    google: {
      clientId: Bun.env.GOOGLE_CLIENT_ID,
      clientSecret: Bun.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Configuration cookies
  cookies: {
    name: 'auth_token',
    secure: true, // true en HTTPS ; false en localhost HTTP
    sameSite: 'none', // si front et back sont sur des domaines différents
    path: '/',
  },
});
