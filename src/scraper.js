import axios from 'axios';
import cheerio from 'cheerio';

export async function scrapeTracksForGenres(genres, pagesPerGenre, excludedTags = []) {
  const results = {};

  for (const genre of genres) {
    results[genre] = [];
    const seen = new Set();

    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      const url = `https://hypem.com/tags/${genre}${pageNum > 1 ? '/' + pageNum : ''}`;
      console.log(`Scraping ${url}`);

      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const tracks = $('h3.track_name').map((_, el) => {
          const artist = $(el).find('a.artist').text().trim();
          const title = $(el).find('a.track').text().trim();
          const tagEls = $(el).closest('.section-player').find('ul.tags a');
          const tags = tagEls.map((_, t) => $(t).text().trim()).get();
          const lowerTags = tags.map(t => t.toLowerCase());
          if (excludedTags.some(tag => lowerTags.includes(tag.toLowerCase()))) return null;
          const key = `${artist.toLowerCase()}-${title.toLowerCase()}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return { artist, title, tags };
        }).get().filter(Boolean);

        results[genre].push(...tracks);
      } catch (err) {
        console.error(`Erreur scraping ${url}: ${err.message}`);
      }
    }
  }

  return results;
}
