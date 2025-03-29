import { betterAuth } from 'better-auth';
import { Elysia } from 'elysia';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '../db/index.js';
import { user, session, account, verification } from '../db/schema.js';
import { env } from './env.js';
import { sendMail } from '../services/mailerService.js';

const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, verification, account },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  notifications: {
    async email({ type, email, token }) {
      const base = env.FRONTEND_BASE_URL;
      const urls = {
        verification: `${base}/auth/verify?token=${token}`,
        reset_password: `${base}/auth/reset-password?token=${token}`,
      };

      const subjects = {
        verification: '✅ Vérifie ton adresse OurMusic',
        reset_password: '🔐 Réinitialisation de mot de passe',
      };

      const htmls = {
        verification: `
          <h2>Bienvenue 🎉</h2>
          <p>Clique ici pour vérifier ton email :</p>
          <a href="${urls.verification}">Vérifier mon adresse</a>
        `,
        reset_password: `
          <h2>Réinitialise ton mot de passe</h2>
          <p>Tu as demandé un nouveau mot de passe ? Clique ici :</p>
          <a href="${urls.reset_password}">Réinitialiser</a>
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

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).use(auth.plugin).macro({
  auth: {
    async resolve({ request, error }) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return error(401, 'Non authentifié');
      return { user: session.user, session: session.session };
    },
  },
});
