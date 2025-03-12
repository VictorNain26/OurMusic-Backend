import { verifyToken } from '../utils/helpers.js';
import { User } from '../db.js';

export async function verifyAccessToken(req) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return await User.findByPk(decoded.id);
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
  return await User.findByPk(decoded.id);
}
