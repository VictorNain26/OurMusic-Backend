import { auth } from '../lib/auth/index.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { user as userTable } from '../db/schema.js';
import { APIError } from 'better-auth/api';

const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('❌ Variables ADMIN manquantes');
  process.exit(1);
}

(async () => {
  try {
    // Crée l'utilisateur admin via Better Auth
    await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_USERNAME,
      },
    });

    console.log(`✅ Utilisateur admin créé avec succès (${ADMIN_EMAIL})`);
  } catch (error) {
    if (error instanceof APIError && error.status === 409) {
      console.log(`ℹ️ L'utilisateur existe déjà (${ADMIN_EMAIL})`);
    } else {
      console.error('❌ Erreur pendant le signUp admin :', error);
      process.exit(1);
    }
  }

  try {
    // Mise à jour du rôle en admin + email vérifié
    const updated = await db
      .update(userTable)
      .set({ role: 'admin', emailVerified: true })
      .where(sql`LOWER("user".email) = LOWER(${ADMIN_EMAIL})`)
      .returning();

    if (updated.length === 0) {
      console.warn(`⚠️ Aucune ligne mise à jour pour ${ADMIN_EMAIL}`);
    } else {
      console.log(`🔧 Rôle admin et email vérifié pour ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error('❌ Erreur SQL lors de la mise à jour du rôle admin :', error);
    process.exit(1);
  }

  process.exit(0);
})();
