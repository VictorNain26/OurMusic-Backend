import { verifyToken } from '../utils/jwt.js';
import { User } from '../db.js';

export async function verifyAccessToken(req) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return await User.findByPk(decoded.id);
}
