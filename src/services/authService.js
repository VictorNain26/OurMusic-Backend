import { db, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  createRefreshCookie,
  clearRefreshCookie,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from '../utils/helpers.js';
import { eq, or } from 'drizzle-orm';

export async function register(req, headers) {
  const { username, email, password } = await req.json();
  if (!username || !email || !password)
    return errorResponse('Champs requis manquants', 400, headers);
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .then(r => r[0]);
  if (existing) return errorResponse('Email déjà utilisé', 400, headers);
  const [user] = await db.insert(schema.users).values({ username, email, password }).returning();
  return jsonResponse({ message: 'Inscription réussie', user }, 201, headers);
}

export async function login(req, headers) {
  const { email, password } = await req.json();
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .then(r => r[0]);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return unauthorizedResponse(headers);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return new Response(JSON.stringify({ message: 'Connexion OK', accessToken, user }), {
    status: 200,
    headers: {
      ...headers,
      'Set-Cookie': createRefreshCookie(refreshToken),
      'Content-Type': 'application/json',
    },
  });
}

export async function refresh(req, headers) {
  const match = (req.headers.get('Cookie') || '').match(/(^|;\s*)refresh=([^;]+)/);
  if (!match) return unauthorizedResponse(headers);
  const decoded = verifyToken(match[2]);
  if (!decoded) return unauthorizedResponse(headers);
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, decoded.id))
    .then(r => r[0]);
  if (!user) return unauthorizedResponse(headers);
  return jsonResponse({ accessToken: signAccessToken(user) }, 200, headers);
}

export async function me(req, headers) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return unauthorizedResponse(headers);
  const decoded = verifyToken(authHeader.replace('Bearer ', '').trim());
  const user = decoded
    ? await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0])
    : null;
  if (!user) return unauthorizedResponse(headers);
  return jsonResponse(user, 200, headers);
}

export async function logout(_, headers) {
  return new Response(JSON.stringify({ message: 'Déconnexion réussie' }), {
    status: 200,
    headers: { ...headers, 'Set-Cookie': clearRefreshCookie(), 'Content-Type': 'application/json' },
  });
}
