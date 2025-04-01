import { auth } from '../lib/auth/auth.js';
import { APIError } from 'better-auth/api';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes');
  process.exit(1);
}

try {
  const userData = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_USERNAME,
      attributes: { role: 'admin', emailVerified: true },
    },
  });
  console.log(`✅ Utilisateur admin créé avec succès (${ADMIN_EMAIL})`, userData);
} catch (error) {
  if (error instanceof APIError && error.status === 409) {
    const userData = await auth.api.updateUser({
      body: {
        email: ADMIN_EMAIL,
        attributes: { role: 'admin' },
        emailVerified: true,
      },
    });
    console.log(`✅ Utilisateur admin mis à jour (${ADMIN_EMAIL})`, userData);
  } else {
    console.error('❌ Erreur lors de la création de l’admin :', error);
    process.exit(1);
  }
}

process.exit(0);
