import { object, string, email, minLength } from 'valibot';

// ✅ Schéma de validation pour l'inscription utilisateur
export const registerSchema = object({
  username: string([minLength(1, 'Nom d’utilisateur requis')]),
  email: string([email('Email invalide')]),
  password: string([minLength(6, 'Mot de passe trop court (6 caractères minimum)')]),
});

// ✅ Schéma de validation pour la connexion utilisateur
export const loginSchema = object({
  email: string([email('Email invalide')]),
  password: string([minLength(1, 'Mot de passe requis')]),
});
