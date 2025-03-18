const ipHits = new Map();
const LIMIT = 20; // requêtes max par minute
const WINDOW = 60 * 1000;

export function rateLimiter() {
  return app => {
    app.onRequest(({ request }) => {
      const ip =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('cf-connecting-ip') ||
        'local';
      const now = Date.now();
      const entry = ipHits.get(ip) || { count: 0, start: now };

      if (now - entry.start > WINDOW) {
        ipHits.set(ip, { count: 1, start: now });
        return;
      }

      entry.count++;
      if (entry.count > LIMIT) {
        console.warn(`[RateLimit] IP ${ip} bloquée temporairement.`);
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
