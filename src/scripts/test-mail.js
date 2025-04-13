import { sendMail } from '../services/mailerService.js';
import { env } from '../config/env.js';

const testEmail = 'victor.lenain26@gmail.com';

async function testVerificationEmail() {
  const testToken = 'test-verification-token';
  const testLink = `${env.FRONTEND_BASE_URL}/verify?token=${testToken}`;

  console.log('🚀 Test: Envoi de l’email de vérification...');
  await sendMail({
    to: testEmail,
    subject: '🎉 Test OurMusic — Vérification d’email',
    variables: {
      preheader: 'Ceci est un test pour la vérification d’email OurMusic 🎶',
      isVerificationEmail: true,
      buttonLink: testLink,
      buttonText: 'Vérifier mon email',
    },
  });
  console.log('✅ Email de vérification envoyé avec succès.');
}

async function testResetPasswordEmail() {
  const testToken = 'test-reset-token';
  const testLink = `${env.FRONTEND_BASE_URL}/reset-password?token=${testToken}`;

  console.log('🚀 Test: Envoi de l’email de réinitialisation du mot de passe...');
  await sendMail({
    to: testEmail,
    subject: '🔒 Test OurMusic — Réinitialisation de mot de passe',
    variables: {
      preheader: 'Ceci est un test pour la réinitialisation de mot de passe OurMusic 🔒',
      isResetPassword: true,
      buttonLink: testLink,
      buttonText: 'Réinitialiser mon mot de passe',
    },
  });
  console.log('✅ Email de réinitialisation envoyé avec succès.');
}

// Exécution des tests
(async () => {
  try {
    await testVerificationEmail();
    await testResetPasswordEmail();
    console.log('🎉 Tous les tests d’email ont été exécutés avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors des tests d’email :', error);
    process.exit(1);
  }
})();
