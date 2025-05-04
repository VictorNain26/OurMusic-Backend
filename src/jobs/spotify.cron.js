import { handleSpotifySyncAll } from '../services/spotifyService.js';

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
    // Ne pas re-afficher err.message si déjà loggé dans `logger`
    console.error(
      '[CRON] ❌ Erreur pendant la synchronisation (non capturée dans logger) :',
      err.message
    );
  }
}
