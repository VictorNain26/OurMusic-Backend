export const env = {
  PORT: Bun.env.PORT || 3000,
  JWT_SECRET: Bun.env.JWT_SECRET,
  ALLOWED_ORIGINS: [/https:\/\/ourmusic\.fr$/, /https:\/\/ourmusic-api\.ovh$/],
};

if (!env.JWT_SECRET) throw new Error('❌ JWT_SECRET manquant dans le .env');
