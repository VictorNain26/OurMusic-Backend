import axios from 'axios';
import { parseTracksFromHTML } from './scraper/parser.js';
import { deduplicateTracks } from './scraper/utils.js';
import { delay } from './utils.js'; // Ton delay est déjà dans utils.js

export async function scrapeTracksForGenres(genres, pagesPerGenre = 1, excludedTags = []) {
  const results = {};

  for (const genre of genres) {
    results[genre] = [];
    const seen = new Set();

    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      const url = `https://hypem.com/tags/${genre}${pageNum > 1 ? '/' + pageNum : ''}`;
      console.log(`Scraping ${url}`);

      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OurMusicBot/1.0)'
          },
          timeout: 10000
        });

        const tracks = parseTracksFromHTML(response.data, excludedTags);
        const uniqueTracks = deduplicateTracks(tracks);
        results[genre].push(...uniqueTracks);

        await delay(1000);

      } catch (err) {
        console.error(`Erreur scraping ${url}: ${err.message}`);
      }
    }
  }

  return results;
}
