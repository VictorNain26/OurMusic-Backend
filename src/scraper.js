import axios from 'axios';
import * as cheerio from 'cheerio';
import rateLimit from 'p-ratelimit';
import { getSpotifyAccessToken, getTrackDurationFromSpotify } from './spotify.js';

// ✅ Création du rate limiter (max 10 requêtes/s, 1 à la fois)
const limiter = rateLimit({
  interval: 1000, // durée de la fenêtre
  rate: 10, // max 10 appels dans cette fenêtre
  concurrency: 1, // un seul appel en parallèle
});

// ✅ Scrape HypeMachine par genre, exclut les tags et les morceaux > 6 min
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

        const filteredTracks = await Promise.all(
          rawTracks.map(track =>
            limiter(() => getTrackDurationFromSpotify(track.artist, track.title, token))
              .then(duration => {
                if (!duration) {
                  console.log(`⏱️ Ignoré (durée inconnue) : ${track.artist} - ${track.title}`);
                  return null;
                }

                if (duration <= 6 * 60 * 1000) {
                  console.log(
                    `🎵 Gardé : ${track.artist} - ${track.title} (${(duration / 60000).toFixed(2)} min)`
                  );
                  return track;
                } else {
                  console.log(
                    `⏱️ Ignoré (>6min) : ${track.artist} - ${track.title} (${(duration / 60000).toFixed(2)} min)`
                  );
                  return null;
                }
              })
              .catch(err => {
                console.warn(
                  `⚠️ Erreur Spotify : ${track.artist} - ${track.title} → ${err.message}`
                );
                return null;
              })
          )
        );

        results[genre].push(...filteredTracks.filter(Boolean));
      } catch (error) {
        console.error(`[Scraper Error] (${url}): ${error.message}`);
      }
    }
  }

  return results;
}

// ✅ Parsing HTML de HypeMachine
function parseTracksFromHTML(html, excludedTags = []) {
  const $ = cheerio.load(html);
  const tracks = [];
  const seenArtists = new Set();

  $('h3.track_name').each((_, el) => {
    const artist = $(el).find('a.artist').text().trim();
    const title = $(el).find('a.track').text().trim();

    if (!artist || !title || seenArtists.has(artist.toLowerCase())) return;

    const tags = $(el)
      .closest('.section-player')
      .find('ul.tags a')
      .map((_, tag) => $(tag).text().trim().toLowerCase())
      .get();

    if (excludedTags.some(tag => tags.includes(tag))) return;

    seenArtists.add(artist.toLowerCase());
    tracks.push({ artist, title, tags });
  });

  return tracks;
}
