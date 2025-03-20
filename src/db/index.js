// src/db/index.js
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { logInfo, logError } from '../config/logger.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ DATABASE_URL manquant dans les variables d’environnement');
}

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export async function initDatabase() {
  try {
    await pool.query('SELECT 1');
    logInfo('✅ Connexion PostgreSQL établie avec succès.');
  } catch (err) {
    logError('❌ Erreur de connexion à PostgreSQL :', err);
    throw new Error('Connexion à PostgreSQL impossible.');
  }
  return db;
}

export { schema };
