import { getSpotifyAccessToken, getOurMusicPlaylists } from '../spotify.js';

(async () => {
  try {
    console.log('🚀 Récupération des playlists OurMusic...');

    const token = await getSpotifyAccessToken();
    const playlists = await getOurMusicPlaylists(token);

    if (!playlists.length) {
      console.log('❌ Aucune playlist "OurMusic" trouvée.');
      process.exit(1);
    }

    console.log(`🎵 ${playlists.length} playlists trouvées :\n`);

    playlists.forEach(playlist => {
      console.log(`- 📋 Nom : ${playlist.name}`);
      console.log(`  🆔 ID  : ${playlist.id}\n`);
    });

    console.log('✅ Liste complète affichée.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des playlists :', error.message);
    process.exit(1);
  }
})();
