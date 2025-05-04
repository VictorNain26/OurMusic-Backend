import { cron } from 'bun';
import { runSpotifyCronSync } from './jobs/spotify.cron.js';
import { runScrapeCronJob } from './jobs/scrape.cron.js';

const CRON_SPOTIFY = process.env.SPOTIFY_CRON || '0 3 * * 1'; // lundi 3h
const CRON_SCRAPE = process.env.SCRAPE_CRON || '0 3 * * 0,3'; // dimanche (0) et mercredi (3) à 3h

console.log(`[CRON] Spotify sync planifié à "${CRON_SPOTIFY}"`);
cron(CRON_SPOTIFY, async () => {
  await runSpotifyCronSync();
});

console.log(`[CRON] Scraping planifié à "${CRON_SCRAPE}"`);
cron(CRON_SCRAPE, async () => {
  await runScrapeCronJob();
});
