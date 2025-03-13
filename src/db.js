import { db } from './db/index.js';

// Optionnel : Vous pouvez effectuer ici des opérations d'initialisation si nécessaire
export async function initDatabase() {
  // Par exemple, vous pouvez lancer une requête test pour vérifier la connexion
  // await db.query('SELECT 1');
  return db;
}

export { db };
