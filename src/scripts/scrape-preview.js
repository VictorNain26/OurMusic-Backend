import { scrapeTracksForGenres } from '../scraper.js';

const genres = [
  'indie+rock',
  'pop',
  'electronica',
  'electronic',
  'hip+hop',
  'rock',
  'classical',
  'awesome',
];
const excludedTags = [
  'trance',
  'metal',
  'dubstep',
  'acid',
  'screamo',
  'easy+listening',
  'heavy+metal',
  'industrial+metal',
  'emo',
  'black+metal',
  'death+metal',
  'hardcore',
  'reggae',
  'trash+metal',
];

(async () => {
  console.time('scrape');
  const results = await scrapeTracksForGenres(genres, 1, excludedTags);
  console.timeEnd('scrape');

  // ------------------------------
  //  Vérification des doublons
  // ------------------------------
  const flat = Object.values(results).flat();
  const uniq = new Set(flat.map(t => `${t.artist.toLowerCase()}-${t.title.toLowerCase()}`));
  const total = flat.length;

  console.log(`\n🎧  Total récupéré : ${total}`);
  console.log(`✅  Uniques        : ${uniq.size}`);

  if (total !== uniq.size) {
    console.log('❌  DUPLICATES FOUND\n');
    // Affiche exactement quels titres sont dupliqués
    const seen = new Set();
    flat.forEach(({ artist, title, tags }) => {
      const key = `${artist.toLowerCase()}-${title.toLowerCase()}`;
      if (seen.has(key)) console.log(`· ${artist} – ${title}`);
      else seen.add(key);
    });
    process.exit(1);
  } else {
    console.log('🎉  Aucun doublon détecté');
    process.exit(0);
  }
})();
