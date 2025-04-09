import { sendMail } from '../services/mailerService.js';

// 📬 Adresse de réception pour le test (met ton adresse réelle ici)
const testEmail = 'victor.lenain26@gmail.com';

// 📌 Exemple de test pour la vérification d'email
async function testVerificationEmail() {
  console.log("🚀 Test: Envoi de l'email de vérification...");

  await sendMail({
    to: testEmail,
    subject: "🎉 Test OurMusic — Vérification d'email",
    variables: {
      preheader: "Ceci est un test pour la vérification d'email OurMusic 🎶",
      isVerificationEmail: true,
      buttonLink: 'http://localhost:8080/verify?token=test123',
      buttonText: 'Vérifier mon email',
    },
  });

  console.log('✅ Email de vérification envoyé avec succès.');
}

// 📌 Exemple de test pour le reset de mot de passe
async function testResetPasswordEmail() {
  console.log("🚀 Test: Envoi de l'email de réinitialisation du mot de passe...");

  await sendMail({
    to: testEmail,
    subject: '🔒 Test OurMusic — Réinitialisation de mot de passe',
    variables: {
      preheader: 'Ceci est un test pour la réinitialisation du mot de passe OurMusic 🔒',
      isResetPassword: true,
      buttonLink: 'http://localhost:8080/reset-password?token=test123',
      buttonText: 'Réinitialiser mon mot de passe',
    },
  });

  console.log('✅ Email de réinitialisation envoyé avec succès.');
}

// 🚦 Exécution des tests
(async () => {
  try {
    await testVerificationEmail();
    await testResetPasswordEmail();

    console.log("🎉 Tous les tests d'email ont été exécutés avec succès.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors des tests d'email :", error);
    process.exit(1);
  }
})();
