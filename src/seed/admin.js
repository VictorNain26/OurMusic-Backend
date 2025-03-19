import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes dans le .env');
  process.exit(1);
}

try {
  const existing = await db.query.user.findFirst({
    where: eq(schema.user.email, ADMIN_EMAIL),
  });

  if (existing) {
    console.log(`ℹ️ L'utilisateur admin (${ADMIN_EMAIL}) existe déjà. Aucun seed nécessaire.`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await db.insert(schema.user).values({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ Utilisateur admin seedé avec succès.');
  process.exit(0);
} catch (err) {
  console.error('❌ Erreur lors du seed admin :', err);
  process.exit(1);
}
