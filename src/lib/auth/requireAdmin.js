export async function requireAdmin({ user }) {
  if (!user) {
    return { status: 401, error: 'Non connecté' };
  }

  if (user.role !== 'admin') {
    return { status: 403, error: 'Accès interdit : admin uniquement' };
  }

  return null;
}
