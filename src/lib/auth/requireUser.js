// Ce fichier est optionnel maintenant grâce à la macro.
// Tu peux le garder pour compatibilité, mais tu n'en auras plus besoin dans tes routes.
export async function requireUser({ user }) {
  if (!user) {
    return { status: 401, error: 'Non connecté' };
  }

  return null;
}
