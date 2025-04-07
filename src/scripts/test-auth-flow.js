import { auth } from '../lib/auth/index.js';
import { db, schema } from '../db/index.js';
import { sql } from 'drizzle-orm';

(async () => {
  try {
    console.log('🚀 Test API Interne (auth.api) — Création utilisateur de test & Connexion');

    const email = 'OurMusicMail@proton.me';
    const password = 'TestPassword123!';
    const name = 'Test User';

    // Étape 1: Supprimer l'utilisateur de test s'il existe déjà
    await db.delete(schema.user).where(sql`LOWER(email) = LOWER(${email})`);
    console.log('🧹 Utilisateur de test nettoyé avant test.');

    // Étape 2: Création utilisateur de test
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name },
    });
    console.log('✅ Utilisateur de test créé :', signUpResponse);

    // Étape 3: Forcer l'email comme vérifié pour l'utilisateur de test
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(sql`LOWER(email) = LOWER(${email})`);
    console.log('✅ Email utilisateur de test marqué comme vérifié.');

    // Étape 4: Connexion utilisateur de test
    const loginResponse = await auth.api.signInEmail({
      body: { email, password },
    });
    console.log('✅ Connexion utilisateur de test réussie :', loginResponse);

    // Étape 5: Nettoyage après test
    await db.delete(schema.user).where(sql`LOWER(email) = LOWER(${email})`);
    console.log('🧹 Utilisateur de test supprimé après test.');

    console.log('🎉 Test API Interne terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur dans le test local :', error);
    process.exit(1);
  }
})();
