import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export async function likeTrack({ user, body }) {
  const { title, artist, artwork, youtubeUrl } = body;

  try {
    const existingTrack = await db
      .select()
      .from(schema.likedTracks)
      .where(
        and(
          eq(schema.likedTracks.userId, user.id),
          eq(schema.likedTracks.title, title),
          eq(schema.likedTracks.artist, artist)
        )
      )
      .limit(1)
      .then(res => res[0]);

    if (existingTrack) {
      return { status: 400, error: 'Déjà liké' };
    }

    const [likedTrack] =
