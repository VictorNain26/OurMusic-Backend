import { handleSpotifySyncAll } from '../services/spotifyService.js';

// ⚠️ Simule un admin (comme dans sync-by-id.js)
const fakeAdmin = { id: 'admin-cron', role: 'admin', email: 'admin@ourmusic.fr' };

const logger = payload => {
  if (payload.message) console.log('ℹ️', payload.message);
  if (payload.error) console.error('❌', payload.error);
};

export async function runSpotifyCronSync() {
  console.log('[CRON] 🔁 Début de la tâche de synchronisation Spotify');
  try {
    await handleSpotifySyncAll(fakeAdmin, logger);
    console.log('[CRON] ✅ Synchronisation terminée avec succès.');
  } catch (err) {
    console.error('[CRON] ❌ Erreur pendant la synchronisation :', err);
  }
}
