import { BetterAuth } from 'better-auth';
import { Elysia } from 'elysia';

import { db } from '../db.js';
import { user, session, account, verification } from '../db/schema.js';
import { env } from './env.js';
import { sendMail } from '../services/mailerService.js';

export const auth = BetterAuth({
  secret: env.BETTER_AUTH_SECRET,
  db,
  schema: {
    user,
    session,
    account,
    verification,
  },

  // ✉️ Notifications personnalisées pour vérification et reset password
  notifications: {
    async email({ type, email, token }) {
      const baseUrl = env.FRONTEND_BASE_URL || 'https://ourmusic.fr';

      if (type === 'verification') {
        const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;
        await sendMail({
          to: email,
          subject: '✅ Vérifie ton adresse OurMusic',
          html: `
            <h2>Bienvenue sur OurMusic 🎶</h2>
            <p>Merci de t'être inscrit. Clique ci-dessous pour vérifier ton adresse email :</p>
            <p><a href="${verifyUrl}" target="_blank">Vérifier mon adresse</a></p>
            <p>Ce lien est valable 24h.</p>
          `,
        });
      }

      if (type === 'reset_password') {
        const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
        await sendMail({
          to: email,
          subject: '🔐 Réinitialisation du mot de passe OurMusic',
          html: `
            <h2>Mot de passe oublié ?</h2>
            <p>Pas de panique, clique ici pour réinitialiser ton mot de passe :</p>
            <p><a href="${resetUrl}" target="_blank">Réinitialiser mon mot de passe</a></p>
            <p>Ce lien est valable 1h.</p>
          `,
        });
      }
    },
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
