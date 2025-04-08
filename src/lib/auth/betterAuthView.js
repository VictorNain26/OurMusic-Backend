import { auth } from './index.js';

export async function betterAuthView(ctx) {
  const allowedMethods = ['POST', 'GET', 'OPTIONS'];
  const origin = ctx.request.headers.get('origin') || '*';

  if (!allowedMethods.includes(ctx.request.method)) {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers':
          'Set-Cookie, Content-Type, Authorization, Content-Length, X-Knowledge-Base',
      },
    });
  }

  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers':
          'Set-Cookie, Content-Type, Authorization, Content-Length, X-Knowledge-Base',
      },
    });
  }

  const response = await auth.handler(ctx.request);
  const headers = new Headers(response.headers);

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set(
    'Access-Control-Expose-Headers',
    'Set-Cookie, Content-Type, Authorization, Content-Length, X-Knowledge-Base'
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
