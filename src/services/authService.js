// src/services/authService.js
import { db, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { logInfo, logError } from '../config/logger.js';

// ➕ Crée l'utilisateur administrateur à l'initialisation
export async function createAdminUser() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;

  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    logWarn('Variables ADMIN_* manquantes — admin non créé.');
    return;
  }

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

    logInfo('✅ Utilisateur admin créé avec succès.');
  } catch (error) {
    logError('[createAdminUser Error]', error);
    throw error;
  }
}

// ➕ Inscription sécurisée d'un utilisateur
export async function registerUser({ username, email, password }) {
  if (!username || !email || !password) {
    throw new Error('Champs requis manquants');
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

  return sanitizeUser(user);
}

// 🔐 Authentifie un utilisateur (login sécurisé)
export async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Champs requis manquants');
  }

  const user = await getUserByEmail(email);
  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error('Identifiants invalides');
  }

  return sanitizeUser(user);
}

// 🧼 Retire les infos sensibles du user
export function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// 🔐 Récupère l’utilisateur depuis son ID (auth refresh ou /me)
export async function getUserById(id) {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)
    .then(res => res[0]);

  return user ? sanitizeUser(user) : null;
}

// 🔒 Cherche un utilisateur par email (usage interne uniquement)
async function getUserByEmail(email) {
  return await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)
    .then(res => res[0]);
}

// 🔐 Hash sécurisé du mot de passe
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

// 🔍 Compare un mot de passe brut et hashé
async function comparePassword(plain, hashed) {
  return await bcrypt.compare(plain, hashed);
}
