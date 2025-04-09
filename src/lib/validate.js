import { safeParse } from 'valibot';

export function validateBody(schema, body) {
  const result = safeParse(schema, body);

  if (!result.success) {
    const messages = result.issues.map(issue => issue.message).join(', ');
    return { status: 400, error: `Validation échouée : ${messages}` };
  }

  return result.output;
}
