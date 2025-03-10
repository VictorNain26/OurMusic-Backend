import cheerio from 'cheerio';

export function parseTracksFromHTML(html, excludedTags = []) {
  const $ = cheerio.load(html);
  const tracks = [];

  $('h3.track_name').each((_, el) => {
    const artist = $(el).find('a.artist').text().trim();
    const title = $(el).find('a.track').text().trim();

    const section = $(el).closest('.section-player');
    const tags = section.find('ul.tags a').map((_, tag) => $(tag).text().trim()).get();
    const lowerTags = tags.map(t => t.toLowerCase());

    if (excludedTags.some(tag => lowerTags.includes(tag.toLowerCase()))) return;

    tracks.push({ artist, title, tags });
  });

  return tracks;
}
