import { auth } from '../lib/auth/index.js';
import { APIError } from 'better-auth/api';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes');
  process.exit(1);
}

(async () => {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_USERNAME,
        attributes: {
          role: 'admin',
          emailVerified: true,
        },
      },
    });

    console.log(`✅ Utilisateur admin créé avec succès (${ADMIN_EMAIL})`, result);
  } catch (error) {
    if (error instanceof APIError && error.status === 409) {
      console.log('ℹ️ Admin déjà existant, mise à jour en cours...');

      const result = await auth.api.updateUser({
        body: {
          email: ADMIN_EMAIL,
          attributes: {
            role: 'admin',
            emailVerified: true,
          },
        },
      });

      console.log(`✅ Admin mis à jour avec succès (${ADMIN_EMAIL})`, result);
    } else {
      console.error('❌ Erreur pendant le seed admin :', error);
      process.exit(1);
    }
  }

  process.exit(0);
})();
