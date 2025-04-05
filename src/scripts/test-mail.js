import { sendMail } from '../services/mailerService.js';

(async () => {
  try {
    await sendMail({
      to: 'victor.lenain26@gmail.com',
      subject: '🎉 Test de template dynamique réussi',
      variables: {
        title: 'Bienvenue sur OurMusic !',
        content:
          'Nous sommes ravis de vous compter parmi nous. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail.',
        buttonLink: 'https://ourmusic.fr/verify?token=test123',
        buttonText: 'Vérifier mon email',
      },
    });

    console.log('✅ Email de test envoyé avec succès.');
  } catch (error) {
    console.error("❌ Échec de l'envoi de l'email de test :", error);
  }

  process.exit(0);
})();
