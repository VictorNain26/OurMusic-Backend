// 📁 src/config/env.js
export const env = {
  PORT: Bun.env.PORT || 3000,
  DATABASE_URL: Bun.env.DATABASE_URL,
  JWT_SECRET: Bun.env.JWT_SECRET, // optionnel si utilisé ailleurs
  ALLOWED_ORIGINS: ['https://ourmusic.fr', 'https://ourmusic-api.ovh'],
  BETTER_AUTH_SECRET: Bun.env.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: Bun.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: Bun.env.GOOGLE_CLIENT_SECRET,
};

// ✅ Vérification stricte des variables Better Auth
if (!env.DATABASE_URL) throw new Error('❌ DATABASE_URL manquant dans le .env');
if (!env.BETTER_AUTH_SECRET) throw new Error('❌ BETTER_AUTH_SECRET manquant dans le .env');
if (!env.ALLOWED_ORIGINS || !Array.isArray(env.ALLOWED_ORIGINS)) {
  throw new Error('❌ ALLOWED_ORIGINS mal configuré dans le fichier .env');
}
