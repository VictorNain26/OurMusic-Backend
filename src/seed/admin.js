import { auth } from '../utils/auth.js';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes dans le .env');
  process.exit(1);
}

try {
  const result = await auth.register({
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    autoConfirm: true,
    attributes: {
      role: 'admin',
    },
  });

  if (result?.error) {
    console.log(`ℹ️ Admin déjà existant ou erreur : ${result.error}`);
  } else {
    console.log(`✅ Utilisateur admin créé avec succès (${ADMIN_EMAIL})`);
  }

  process.exit(0);
} catch (err) {
  console.error('❌ Erreur Better Auth lors du seed admin :', err);
  process.exit(1);
}
