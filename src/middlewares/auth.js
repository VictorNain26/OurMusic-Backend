import { verifyToken } from '../utils/helpers.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export async function verifyAccessToken(req) {
  if (!req || !req.headers) return null;

  const authHeader =
    (typeof req.headers.get === 'function'
      ? req.headers.get('Authorization')
      : req.headers['authorization']) || '';

  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) return null;

  console.log('[verifyAccessToken] decoded user ID:', decoded.id);

  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, decoded.id))
    .then(r => r[0]);

  if (!user) {
    console.warn('[verifyAccessToken] User not found in DB for ID:', decoded.id);
  }

  return user || null;
}

export async function verifyAdmin(req) {
  const user = await verifyAccessToken(req);
  if (!user || user.role !== 'admin') throw new Error('Accès refusé: admin requis.');
  return user;
}

export async function verifyRefreshToken(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(^|;\s*)refresh=([^;]+)/);
  if (!match) return null;
  const token = match[2];
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, decoded.id))
    .then(r => r[0]);
  return user || null;
}
