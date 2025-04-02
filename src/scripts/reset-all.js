import { execSync } from 'node:child_process';
import { db } from '../db/index.js';

async function resetDatabase() {
  console.log('🧨 Suppression des tables PostgreSQL…');

  try {
    await db.execute(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    console.log('✅ Tables supprimées avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors de la suppression des tables :', err);
    process.exit(1);
  }
}

function runCommand(name, command) {
  try {
    console.log(`▶ ${name}`);
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Erreur pendant "${name}" :`, err.message);
    process.exit(1);
  }
}

(async () => {
  await resetDatabase();

  runCommand('📦 Migration des schémas (drizzle push)', 'bun run db:push');
  runCommand('👑 Création admin (seed)', 'bun run seed:admin');

  console.log('✅ Reset complet terminé.');
})();
