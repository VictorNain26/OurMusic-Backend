import axios from 'axios';

export async function spotifyRequestWithRetry(url, token, method = 'GET', data = null) {
  const headers = { Authorization: `Bearer ${token}` };

  let retries = 3;

  while (retries > 0) {
    try {
      const response = await axios({
        method,
        url,
        data,
        headers,
      });
      return response;
    } catch (err) {
      if (err.response?.status === 429 && err.response.headers['retry-after']) {
        const retryAfter = parseInt(err.response.headers['retry-after'], 10);
        console.warn(`🕒 Rate limit Spotify — attente ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
        retries--;
      } else {
        throw err;
      }
    }
  }

  throw new Error('❌ Trop de tentatives — Spotify API refusée');
}
