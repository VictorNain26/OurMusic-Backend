import { createCookieFile } from '../spotify.js';
import { ensureDirectoryExists } from '../utils/fileUtils.js';
import { handleSpotifySyncById } from '../services/spotifyService.js';

// ➡️ Simuler un admin (fictif car on est en script)
const fakeAdmin = { id: 'admin-script', role: 'admin', email: 'admin@ourmusic.fr' };

const playlistId = process.argv[2]; // récupère l'argument passé en CLI

if (!playlistId) {
  console.error('❌ Veuillez fournir un playlistId en argument');
  console.error('Exemple: bun run src/scripts/sync-by-id.js 3Zhmnqlz2tqkzyoN2qJD3a');
  process.exit(1);
}

function consoleLogger(payload) {
  if (payload.message) console.log('ℹ️', payload.message);
  if (payload.error) console.error('❌', payload.error);
}

(async () => {
  try {
    await handleSpotifySyncById(fakeAdmin, consoleLogger, playlistId);

    console.log('✅ Synchronisation terminée pour la playlist', playlistId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de synchronisation :', error.message);
    process.exit(1);
  }
})();
