export const env = {
  PORT: Bun.env.PORT || 3000,
  JWT_SECRET: Bun.env.JWT_SECRET,
  ALLOWED_ORIGINS: [/https:\/\/ourmusic\.fr$/, /https:\/\/ourmusic-api\.ovh$/],
};

// ✅ Vérification stricte des variables d'environnement essentielles
if (!env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET manquant dans le fichier .env');
}

if (!env.ALLOWED_ORIGINS || !Array.isArray(env.ALLOWED_ORIGINS)) {
  throw new Error('❌ ALLOWED_ORIGINS mal configuré dans le fichier .env');
}
