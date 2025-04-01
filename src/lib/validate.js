import { safeParse } from 'valibot';
import { jsonResponse } from './response.js';

export function validateBody(schema, body) {
  const result = safeParse(schema, body);

  if (!result.success) {
    const messages = result.issues.map(issue => issue.message).join(', ');
    return jsonResponse({ error: `Validation échouée : ${messages}` }, 400);
  }

  return result.output;
}
