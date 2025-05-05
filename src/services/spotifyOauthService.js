import axios from 'axios';
import { env } from '../config/env.js';

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
].join(' ');

export function getSpotifyAuthorizeURL(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: Bun.env.SPOTIFY_CLIENT_ID,
    redirect_uri: `${env.BACKEND_BASE_URL}/api/spotify/callback`,
    scope: SCOPES,
    state,
  });

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${env.BACKEND_BASE_URL}/api/spotify/callback`,
    client_id: Bun.env.SPOTIFY_CLIENT_ID,
    client_secret: Bun.env.SPOTIFY_CLIENT_SECRET,
  });

  const res = await axios.post(SPOTIFY_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return res.data;
}
