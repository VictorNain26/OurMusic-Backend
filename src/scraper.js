import axios from 'axios';
import * as cheerio from 'cheerio';

// ─────────────────────────────────────────────
//  Scraper HypeMachine sans aucun doublon
// ─────────────────────────────────────────────
export async function scrapeTracksForGenres(genres, pages = 1, excludedTags = []) {
  const results = {};
  const seenGlobal = new Set(); // ← 1. clé (artist‑title) globale

  for (const genre of genres) {
    results[genre] = [];
    const seenArtistsGenre = new Set(); // ← 2. un seul titre / artiste / genre

    for (let page = 1; page <= pages; page++) {
      const url = `https://hypem.com/tags/${genre}${page > 1 ? '/' + page : ''}`;

      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': 'OurMusicBot/1.0' },
        });

        const newTracks = parseTracksFromHTML(
          res.data,
          excludedTags,
          seenArtistsGenre,
          seenGlobal // ← 3. on passe aussi le Set global
        );

        console.log(`📥 ${newTracks.length} nouveaux titres pour ${genre} (page ${page})`);
        results[genre].push(...newTracks);
      } catch (err) {
        console.error(`[Scraper Error] (${url}) : ${err.message}`);
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────
//  Parsing HTML
// ─────────────────────────────────────────────
function parseTracksFromHTML(html, excludedTags = [], seenArtistsGenre, seenGlobal) {
  const $ = cheerio.load(html);
  const output = [];

  $('h3.track_name').each((_, el) => {
    const artist = $(el).find('a.artist').text().trim();
    const title = $(el).find('a.track').text().trim();
    if (!artist || !title) return;

    /* 1️⃣  Anti‑doublon global  */
    const globalKey = `${artist.toLowerCase()}-${title.toLowerCase()}`;
    if (seenGlobal.has(globalKey)) return;

    /* 2️⃣  Un seul morceau par artiste dans CE genre  */
    if (seenArtistsGenre.has(artist.toLowerCase())) return;

    /* 3️⃣  Filtres de tags exclus  */
    const tags = $(el)
      .closest('.section-player')
      .find('ul.tags a')
      .map((_, tag) => $(tag).text().trim().toLowerCase())
      .get();

    if (excludedTags.some(tag => tags.includes(tag))) return;

    /* 4️⃣  On garde la piste et on mémorise    */
    seenGlobal.add(globalKey);
    seenArtistsGenre.add(artist.toLowerCase());
    output.push({ artist, title, tags });
  });

  return output;
}
