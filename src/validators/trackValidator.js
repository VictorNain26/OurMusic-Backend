import { object, string, url, minLength } from 'valibot';

export const likeTrackSchema = object({
  title: string([minLength(1, 'Titre requis')]),
  artist: string([minLength(1, 'Artiste requis')]),
  artwork: string([url('Artwork doit être une URL valide')]),
  youtubeUrl: string([url('Lien YouTube invalide')]),
});
