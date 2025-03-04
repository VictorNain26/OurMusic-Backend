// src/scraper.js
import puppeteer from "puppeteer";
import { delay } from "./utils.js";

export async function scrapeTracksForGenres(genres, pagesPerGenre, excludedTags) {
  const browser = await puppeteer.launch({
    browserWSEndpoint: "ws://127.0.0.1:9222",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const results = {};
  for (const genre of genres) {
    results[genre] = [];
    for (let pageNum = 1; pageNum <= pagesPerGenre; pageNum++) {
      let url = `https://hypem.com/tags/${genre}${pageNum > 1 ? "/" + pageNum : ""}`;
      console.log(`Scraping ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector("h3.track_name");
      const tracks = await page.evaluate((excluded) => {
        const trackElements = Array.from(document.querySelectorAll("h3.track_name"));
        return trackElements
          .map((el) => {
            const artist = el.querySelector("a.artist")?.innerText.trim() || "";
            const title = el.querySelector("a.track")?.innerText.trim() || "";
            const sectionPlayer = el.closest(".section-player");
            const tagContainer = sectionPlayer ? sectionPlayer.querySelector("ul.tags") : null;
            const tags = tagContainer
              ? Array.from(tagContainer.querySelectorAll("a")).map((a) => a.innerText.trim())
              : [];
            const lowerTags = tags.map((t) => t.toLowerCase());
            if (excluded.some((ex) => lowerTags.includes(ex.toLowerCase()))) return null;
            return { artist, title, tags };
          })
          .filter(Boolean);
      }, excludedTags);
      results[genre].push(...tracks);
    }
    // Conserver uniquement le premier morceau par artiste
    const seenArtists = new Set();
    results[genre] = results[genre].filter((track) => {
      const key = track.artist.toLowerCase();
      if (seenArtists.has(key)) return false;
      seenArtists.add(key);
      return true;
    });
  }
  await browser.close();
  return results;
}
