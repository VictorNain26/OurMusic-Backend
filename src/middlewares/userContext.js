import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export function userContext() {
  return {
    async onRequest(ctx) {
      const token =
        ctx.request.headers.get('Authorization')?.replace('Bearer ', '').trim() ||
        ctx.cookie?.refresh?.value;

      if (token) {
        try {
          const decoded = await ctx.jwt.verify(token);
          if (!decoded || !decoded.id) return;

          const user = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, decoded.id))
            .limit(1)
            .then(r => r[0]);

          if (user) {
            ctx.user = user;
          }
        } catch (err) {
          console.warn('[JWT Decode Error]', err.message);
        }
      }
    },
  };
}
