import { sendMail } from '../../services/mailerService.js';

export async function sendBetterAuthEmail({
  to,
  subject,
  preheader,
  buttonLink,
  buttonText,
  isVerificationEmail = false,
  isResetPassword = false,
}) {
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
    console.log(`✅ Email envoyé à ${to} — Sujet : "${subject}"`);
  } catch (error) {
    console.error('[BetterAuth Email Error]', error);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
