import 'dotenv/config';
import { auth } from '../plugins/auth.js';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes');
  process.exit(1);
}

try {
  const result = await auth.createUser({
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    attributes: {
      role: 'admin',
    },
    autoConfirm: true,
  });

  if (result?.error) {
    console.log(`ℹ️ Admin déjà existant ou erreur : ${result.error}`);
  } else {
    console.log(`✅ Utilisateur admin créé avec succès (${ADMIN_EMAIL})`);
  }

  process.exit(0);
} catch (err) {
  console.error('❌ Erreur lors de la création de l’admin :', err);
  process.exit(1);
}
