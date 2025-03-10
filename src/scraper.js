import puppeteer from 'puppeteer-core';
import { delay } from './utils.js';

export async function scrapeTracksForGenres(genres, pagesPerGenre, excludedTags) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://lightpanda:9222",
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  const results = {};
  for (const genre of genres) {
    results[genre] = [];
    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      const url = `https://hypem.com/tags/${genre}${pageNum > 1 ? '/' + pageNum : ''}`;
      console.log(`Scraping ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('h3.track_name');
      const tracks = await page.evaluate((excluded) => {
        const trackElements = Array.from(document.querySelectorAll('h3.track_name'));
        return trackElements
          .map((el) => {
            const artist = el.querySelector('a.artist')?.innerText.trim() || '';
            const title = el.querySelector('a.track')?.innerText.trim() || '';
            const sectionPlayer = el.closest('.section-player');
            const tagContainer = sectionPlayer ? sectionPlayer.querySelector('ul.tags') : null;
            const tags = tagContainer
              ? Array.from(tagContainer.querySelectorAll('a')).map((a) => a.innerText.trim())
              : [];
            const lowerTags = tags.map((t) => t.toLowerCase());
            if (excluded.some((ex) => lowerTags.includes(ex.toLowerCase()))) return null;
            return { artist, title, tags };
          })
          .filter(Boolean);
      }, excludedTags);
      results[genre].push(...tracks);
    }
    const seen = new Set();
    results[genre] = results[genre].filter((track) => {
      const key = track.artist.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  await page.close();
  await context.close();
  await browser.disconnect();
  return results;
}
