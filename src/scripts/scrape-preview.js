import { scrapeTracksForGenres } from '../scraper.js';

(async () => {
  const genres = ['indie+rock', 'pop', 'electronica', 'electronic', 'hip+hop', 'rock', 'classical'];
  const excludedTags = [
    'trance',
    'metal',
    'dubstep',
    'screamo',
    'dance',
    'easy+listening',
    'heavy+metal',
    'industrial+metal',
    'heavy+metal',
  ];
  const pages = 1;

  console.log('🚀 Lancement du scraping test…');
  try {
    const results = await scrapeTracksForGenres(genres, pages, excludedTags);

    for (const genre of Object.keys(results)) {
      const tracks = results[genre];
      console.log(`\n🎧 Genre : ${genre} (${tracks.length} morceaux retenus)\n`);
      tracks.forEach(({ artist, title }, index) => {
        console.log(`  ${index + 1}. ${artist} - ${title}`);
      });
    }

    console.log('\n✅ Scraping terminé avec succès.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur pendant le test de scraping :', err.message);
    process.exit(1);
  }
})();
