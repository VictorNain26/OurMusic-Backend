import { verifyToken } from '../utils/jwt.js';
import { User } from '../db.js';

export async function verifyRefreshToken(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(^|;\s*)refresh=([^;]+)/);
  if (!match) return null;

  const token = match[2];
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return await User.findByPk(decoded.id);
}
