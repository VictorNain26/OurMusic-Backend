export async function createAdminUser() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = Bun.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) return;

  const existing = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, ADMIN_EMAIL))
    .limit(1)
    .then(res => res[0]);

  if (existing) return;

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await db.insert(schema.user).values({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ Admin user created.');
}
