import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export async function likeTrack(ctx) {
  const user = ctx.user;
  const { title, artist, artwork, youtubeUrl } = ctx.body;

  const alreadyLiked = await db
    .select()
    .from(schema.likedTracks)
    .where(
      and(
        eq(schema.likedTracks.userId, user.id),
        eq(schema.likedTracks.title, title),
        eq(schema.likedTracks.artist, artist)
      )
    )
    .then(r => r[0]);

  if (alreadyLiked) {
    return new Response(JSON.stringify({ error: 'Déjà liké' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [likedTrack] = await db
    .insert(schema.likedTracks)
    .values({ title, artist, artwork, youtubeUrl, userId: user.id })
    .returning();

  return new Response(JSON.stringify({ message: 'Morceau liké', likedTrack }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getLikedTracks(ctx) {
  const user = ctx.user;

  const likedTracks = await db
    .select()
    .from(schema.likedTracks)
    .where(eq(schema.likedTracks.userId, user.id));

  return new Response(JSON.stringify({ likedTracks }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function unlikeTrack(ctx) {
  const user = ctx.user;
  const trackId = parseInt(ctx.params.id);

  const track = await db
    .select()
    .from(schema.likedTracks)
    .where(and(eq(schema.likedTracks.id, trackId), eq(schema.likedTracks.userId, user.id)))
    .then(r => r[0]);

  if (!track) {
    return new Response(JSON.stringify({ error: 'Morceau introuvable' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.delete(schema.likedTracks).where(eq(schema.likedTracks.id, trackId));

  return new Response(JSON.stringify({ message: 'Morceau retiré' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
