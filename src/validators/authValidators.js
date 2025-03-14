import { object, string, email, minLength } from 'valibot';

export const registerSchema = object({
  username: string('Champ requis'),
  email: string([email('Email invalide')]),
  password: string([minLength(6, 'Mot de passe trop court')]),
});

export const loginSchema = object({
  email: string([email('Email invalide')]),
  password: string([minLength(1, 'Mot de passe requis')]),
});
