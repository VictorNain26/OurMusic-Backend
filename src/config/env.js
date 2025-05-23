export const env = {
  PORT: Bun.env.PORT || 3000,
  DATABASE_URL: Bun.env.DATABASE_URL,
  BETTER_AUTH_SECRET: Bun.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: Bun.env.BETTER_AUTH_URL,
  FRONTEND_BASE_URL: Bun.env.FRONTEND_BASE_URL || 'http://localhost:8080',
  BACKEND_BASE_URL: Bun.env.BACKEND_BASE_URL || 'http://localhost:3000',
  GOOGLE_CLIENT_ID: Bun.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: Bun.env.GOOGLE_CLIENT_SECRET,
  ALLOWED_ORIGINS: Bun.env.ALLOWED_ORIGINS
    ? Bun.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:8080'],
  SPOTIFY_DELAY_MS: Bun.env.SPOTIFY_DELAY_MS ? parseInt(Bun.env.SPOTIFY_DELAY_MS) : 500,
  ENABLE_CRON: Bun.env.ENABLE_CRON === 'true',
};

if (!env.DATABASE_URL) throw new Error('❌ DATABASE_URL manquant');
if (!env.BETTER_AUTH_SECRET) throw new Error('❌ BETTER_AUTH_SECRET manquant');
if (!env.BETTER_AUTH_URL)
  throw new Error('❌ BETTER_AUTH_URL manquant (exemple: https://ourmusic-api.ovh/api/auth)');
