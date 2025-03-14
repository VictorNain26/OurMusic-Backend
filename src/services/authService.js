import { db, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { logInfo, logError } from '../config/logger.js';

// ➡️ Création de l'utilisateur admin à l'initialisation
export async function createAdminUser() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) return;

  try {
    const existing = await getUserByEmail(ADMIN_EMAIL);
    if (existing) return;

    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    await db.insert(schema.users).values({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    });

    console.log('✅ Utilisateur admin créé.');
  } catch (error) {
    console.error('[createAdminUser Error]', error);
    throw error;
  }
}

export async function registerUser({ username, email, password }) {
  if (!username || !email || !password) {
    throw new Error('Tous les champs sont requis');
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error('Email déjà utilisé');
  }

  const hashed = await hashPassword(password);
  const [user] = await db
    .insert(schema.users)
    .values({ username, email, password: hashed })
    .returning();

  return user;
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Champs requis manquants');
  }

  const user = await getUserByEmail(email);
  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error('Identifiants invalides');
  }

  return user;
}

export function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// 🔧 Helpers internes

async function getUserByEmail(email) {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)
    .then(res => res[0]);

  return user;
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(plain, hashed) {
  return await bcrypt.compare(plain, hashed);
}
