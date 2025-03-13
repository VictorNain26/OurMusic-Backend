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
import { eq } from 'drizzle-orm';

export async function createAdminUser() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.warn(
      "Les identifiants administrateur ne sont pas définis dans les variables d'environnement."
    );
    return;
  }
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .then(r => r[0]);

  if (existingAdmin) {
    console.log('Utilisateur admin déjà existant.');
    return;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

  await db.insert(schema.users).values({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
  });
  console.log('Utilisateur admin créé avec succès.');
}

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

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const [user] = await db
    .insert(schema.users)
    .values({ username, email, password: hashedPassword })
    .returning();

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
