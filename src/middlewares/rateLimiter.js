// src/middlewares/rateLimiter.js
const ipHits = new Map();
const LIMIT = 20; // requêtes max par minute
const WINDOW = 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// 🚿 Purge régulière des IPs expirées
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits.entries()) {
    if (now - entry.start > CLEANUP_INTERVAL) {
      ipHits.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

export function rateLimiter() {
  return app => {
    app.onRequest(({ request }) => {
      const ip =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'local';

      const now = Date.now();
      const entry = ipHits.get(ip) || { count: 0, start: now };

      if (now - entry.start > WINDOW) {
        // 🔄 Nouvelle fenêtre de temps
        ipHits.set(ip, { count: 1, start: now });
        return;
      }

      entry.count++;
      if (entry.count > LIMIT) {
        console.warn(`[RateLimiter] Trop de requêtes pour ${ip} (${entry.count}/${LIMIT})`);
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez plus tard.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      ipHits.set(ip, entry);
    });

    return app;
  };
}
