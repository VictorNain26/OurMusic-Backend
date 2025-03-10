export function deduplicateTracks(tracks) {
  const seen = new Set();
  return tracks.filter(({ artist, title }) => {
    const key = `${artist.toLowerCase()}-${title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
