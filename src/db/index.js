import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { logInfo, logError } from '../config/logger.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// 🔧 Test de connexion initial à la base de données
async function testDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    logInfo('✅ Connexion PostgreSQL établie avec succès.');
  } catch (err) {
    logError('Erreur de connexion à PostgreSQL :', err);
    throw new Error('Connexion à PostgreSQL impossible.');
  }
}

await testDatabaseConnection();

export { schema };
