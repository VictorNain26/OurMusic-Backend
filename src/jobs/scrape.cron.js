import { handleSpotifyScrape } from '../services/spotifyService.js';

// ⚠️ Simule un admin (même logique que dans sync-by-id.js)
const fakeAdmin = { id: 'admin-cron', role: 'admin', email: 'admin@ourmusic.fr' };

const logger = payload => {
  if (payload.message) console.log('ℹ️', payload.message);
  if (payload.error) console.error('❌', payload.error);
};

export async function runScrapeCronJob() {
  console.log('[CRON] 🧪 Début de la tâche de scraping Spotify + création de playlists');
  try {
    await handleSpotifyScrape(fakeAdmin, logger);
    console.log('[CRON] ✅ Scraping terminé avec succès.');
  } catch (err) {
    console.error('[CRON] ❌ Erreur pendant le scraping :', err);
  }
}
