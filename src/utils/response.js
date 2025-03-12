export const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

export const errorResponse = (message, status = 500, headers = {}) =>
  jsonResponse({ error: message }, status, headers);

export const unauthorizedResponse = (headers = {}) =>
  errorResponse('Non authentifié', 401, headers);
