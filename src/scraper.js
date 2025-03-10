import puppeteer from 'puppeteer-core';
import { delay } from './utils.js';

async function parseTracksFromPage(page, excludedTags = []) {
  return await page.evaluate((excluded) => {
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
}

export async function scrapeTracksForGenres(genres, pagesPerGenre, excludedTags = []) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://lightpanda:9222",
  });

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  const results = {};

  for (const genre of genres) {
    results[genre] = [];
    const seen = new Set();

    console.log(`🔍 Genre: ${genre}`);

    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      const url = `https://hypem.com/tags/${genre}${pageNum > 1 ? '/' + pageNum : ''}`;
      console.log(`  📄 Scraping page ${pageNum}/${pagesPerGenre}: ${url}`);

      try {
        // Ne pas attendre que tous les scripts soient chargés → éviter les crashs
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

        const hasTracks = await page.$('h3.track_name');
        if (!hasTracks) {
          console.warn(`  ⚠️ Aucun track trouvé sur ${url}`);
          continue;
        }

        const tracks = await parseTracksFromPage(page, excludedTags);

        // Filtrer les doublons
        const newTracks = tracks.filter((track) => {
          const key = `${track.artist.toLowerCase()} - ${track.title.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log(`  ✅ ${newTracks.length} nouveaux tracks ajoutés`);
        results[genre].push(...newTracks);

        // Petit delay pour éviter les bans éventuels
        await delay(1000);

      } catch (err) {
        console.error(`  ❌ Erreur scraping ${url} : ${err.message}`);
        // Optionnel : re-tenter si c’est un problème de frame détaché
      }
    }

    console.log(`🎵 Genre "${genre}" : ${results[genre].length} tracks uniques collectés\n`);
  }

  await page.close();
  await context.close();
  await browser.disconnect();

  return results;
}
