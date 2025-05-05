import axios from 'axios';
import dayjs from 'dayjs';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export async function getFreshSpotifyAccessToken(account) {
  // encore valide ?
  if (dayjs(account.accessTokenExpiresAt).isAfter(dayjs().add(2, 'minute'))) {
    return account.accessToken;
  }

  // sinon on refresh
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
    client_id: Bun.env.SPOTIFY_CLIENT_ID,
    client_secret: Bun.env.SPOTIFY_CLIENT_SECRET,
  });

  const { data } = await axios.post('https://accounts.spotify.com/api/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  await db
    .update(schema.account)
    .set({
      accessToken: data.access_token,
      accessTokenExpiresAt: dayjs().add(data.expires_in, 'second').toDate(),
      refreshToken: data.refresh_token ?? account.refreshToken,
    })
    .where(eq(schema.account.id, account.id));

  return data.access_token;
}
