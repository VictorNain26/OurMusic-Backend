// src/config/auth.config.js
import { betterAuth } from 'better-auth';
import { Elysia } from 'elysia';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '../db/index.js';
import { user, session, account, verification } from '../db/schema.js';
import { env } from './env.js';
import { sendMail } from '../services/mailerService.js';

const baseAuth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL, // ✅ Corrige l’erreur request?.headers.get
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  emailAndPassword: { enabled: true },
  requireEmailVerification: false,

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  notifications: {
    async email({ type, email, token }) {
      const baseUrl = env.FRONTEND_BASE_URL || 'https://ourmusic.fr';

      const routes = {
        verification: `${baseUrl}/auth/verify?token=${token}`,
        reset_password: `${baseUrl}/auth/reset-password?token=${token}`,
      };

      const subjects = {
        verification: '✅ Vérifie ton adresse OurMusic',
        reset_password: '🔐 Réinitialisation du mot de passe OurMusic',
      };

      const htmls = {
        verification: `
          <h2>Bienvenue sur OurMusic 🎶</h2>
          <p>Clique ci-dessous pour vérifier ton adresse email :</p>
          <p><a href="${routes.verification}" target="_blank">Vérifier mon adresse</a></p>
          <p>Ce lien est valable 24h.</p>
        `,
        reset_password: `
          <h2>Mot de passe oublié ?</h2>
          <p>Clique ici pour réinitialiser ton mot de passe :</p>
          <p><a href="${routes.reset_password}" target="_blank">Réinitialiser mon mot de passe</a></p>
          <p>Ce lien est valable 1h.</p>
        `,
      };

      await sendMail({
        to: email,
        subject: subjects[type],
        html: htmls[type],
      });
    },
  },
});

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).use(baseAuth.handler).macro({
  auth: {
    async resolve({ error, request }) {
      const session = await baseAuth.api.getSession({ headers: request.headers });
      if (!session) return error(401, 'Non authentifié');

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});
