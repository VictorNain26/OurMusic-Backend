import axios from 'axios';
import * as cheerio from 'cheerio';

// ✅ Scrape les morceaux par genres sur HypeMachine (1 seul morceau par artiste)
export async function scrapeTracksForGenres(genres, pages = 1, excludedTags = []) {
  const results = {};

  for (const genre of genres) {
    results[genre] = [];

    for (let page = 1; page <= pages; page++) {
      const url = `https://hypem.com/tags/${genre}${page > 1 ? '/' + page : ''}`;
      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': 'OurMusicBot/1.0' },
        });
        const tracks = parseTracksFromHTML(res.data, excludedTags);
        results[genre].push(...tracks);
      } catch (error) {
        console.error(`[Scraper Error] (${url}): ${error.message}`);
      }
    }
  }

  return results;
}

// ✅ Parse les morceaux depuis le HTML obtenu
// Ne garde qu'un seul morceau par artiste (le premier trouvé)
function parseTracksFromHTML(html, excludedTags = []) {
  const $ = cheerio.load(html);
  const tracks = [];
  const seenArtists = new Set();

  $('h3.track_name').each((_, el) => {
    const artist = $(el).find('a.artist').text().trim();
    const title = $(el).find('a.track').text().trim();

    // 🛑 Ignore si artiste déjà vu
    if (seenArtists.has(artist.toLowerCase())) return;

    const tags = $(el)
      .closest('.section-player')
      .find('ul.tags a')
      .map((_, tag) => $(tag).text().trim().toLowerCase())
      .get();

    if (excludedTags.some(tag => tags.includes(tag.toLowerCase()))) return;

    seenArtists.add(artist.toLowerCase());
    tracks.push({ artist, title, tags });
  });

  return tracks;
}
  