import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { user, session, verification, account } from '../../db/schema.js';
import { sendMail } from '../../services/mailerService.js';

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

  emails: {
    async send({ to, subject, html, text, type, token }) {
      // Préheader dynamique selon le type d'email
      let preheader = 'Découvrez OurMusic dès maintenant 🎶';
      let isVerificationEmail = false;
      let isResetPassword = false;
      let buttonLink = '';
      let buttonText = '';

      switch (type) {
        case 'verification-request':
          preheader = 'Confirmez votre adresse email pour activer votre compte 🎶';
          isVerificationEmail = true;
          buttonLink = `${env.FRONTEND_BASE_URL}/verify?token=${token}`;
          buttonText = 'Vérifier mon email';
          break;

        case 'reset-password-request':
          preheader = 'Réinitialisez votre mot de passe pour continuer à profiter de OurMusic 🔒';
          isResetPassword = true;
          buttonLink = `${env.FRONTEND_BASE_URL}/reset-password?token=${token}`;
          buttonText = 'Réinitialiser mon mot de passe';
          break;

        default:
          console.warn(`📩 Type d'email non pris en charge : ${type}`);
          break;
      }

      try {
        await sendMail({
          to,
          subject,
          variables: {
            preheader,
            isVerificationEmail,
            isResetPassword,
            buttonLink,
            buttonText,
          },
        });
      } catch (error) {
        console.error('[BetterAuth Email Error]', error);
      }
    },
  },

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
