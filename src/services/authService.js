import { db, schema } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function createAdminUser() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) return;

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .then(r => r[0]);
  if (existing) return;

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(schema.users).values({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ Utilisateur admin créé.');
}

export async function registerUser({ username, email, password }) {
  if (!username || !email || !password) throw new Error('Champs requis manquants');

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .then(r => r[0]);
  if (existing) throw new Error('Email déjà utilisé');

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(schema.users)
    .values({ username, email, password: hashed })
    .returning();
  return user;
}

export async function loginUser({ email, password }) {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .then(r => r[0]);
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new Error('Identifiants invalides');
  return user;
}
