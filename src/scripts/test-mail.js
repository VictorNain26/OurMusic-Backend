import { sendMail } from '../services/mailerService.js';

(async () => {
  try {
    await sendMail({
      to: 'test-5y0obke2v@srv1.mail-tester.com',
      subject: '🎉 Test SMTP Brevo réussi !',
      html: '<h1>OurMusic - Test réussi ✅</h1><p>Si tu vois cet email, tout est bien configuré 🎶</p>',
    });
    console.log('✅ Email de test envoyé avec succès.');
  } catch (error) {
    console.error("❌ Échec de l'envoi de l'email de test :", error);
  }

  process.exit(0);
})();
