import axios from 'axios';
import * as cheerio from 'cheerio';
import { getSpotifyAccessToken, getTrackDurationFromSpotify } from './spotify.js';

// ✅ Scrape les morceaux par genres sur HypeMachine (1 seul morceau par artiste, durée max 6 min)
export async function scrapeTracksForGenres(genres, pages = 1, excludedTags = []) {
  const results = {};
  const token = await getSpotifyAccessToken();

  for (const genre of genres) {
    results[genre] = [];

    for (let page = 1; page <= pages; page++) {
      const url = `https://hypem.com/tags/${genre}${page > 1 ? '/' + page : ''}`;
      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': 'OurMusicBot/1.0' },
        });

        const rawTracks = parseTracksFromHTML(res.data, excludedTags);

        for (const track of rawTracks) {
          const duration = await getTrackDurationFromSpotify(track.artist, track.title, token);
          if (!duration) {
            console.log(`⏱️ Ignoré (durée inconnue) : ${track.artist} - ${track.title}`);
            continue;
          }

          if (duration <= 6 * 60 * 1000) {
            results[genre].push(track);
            console.log(
              `🎵 Gardé : ${track.artist} - ${track.title} (${(duration / 60000).toFixed(2)} min)`
            );
          } else {
            console.log(
              `⏱️ Ignoré (>6min) : ${track.artist} - ${track.title} (${(duration / 60000).toFixed(2)} min)`
            );
          }
        }
      } catch (error) {
        console.error(`[Scraper Error] (${url}): ${error.message}`);
      }
    }
  }

  return results;
}

// ✅ Parse les morceaux depuis le HTML obtenu (1 seul par artiste, sans tags exclus)
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
