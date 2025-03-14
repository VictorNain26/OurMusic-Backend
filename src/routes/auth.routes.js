import { Elysia } from 'elysia';
import { validateBody } from '../lib/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { registerUser, loginUser, sanitizeUser } from '../services/authService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post('/register', async ({ body }) => {
    const data = validateBody(registerSchema, body);
    if (data instanceof Response) return data;

    try {
      const user = await registerUser(data);
      return jsonResponse({ message: 'Inscription réussie', user: sanitizeUser(user) }, 201);
    } catch (err) {
      console.error('[Register Error]', err);
      return createError(err.message || "Échec de l'inscription", 400);
    }
  })

  .post('/login', async ({ body, jwt, cookie }) => {
    const data = validateBody(loginSchema, body);
    if (data instanceof Response) return data;

    try {
      const user = await loginUser(data);
      const accessToken = await jwt.sign({ id: user.id, role: user.role });
      const refreshToken = await jwt.sign({ id: user.id, role: user.role, exp: '7d' });

      cookie.refresh = {
        value: refreshToken,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      };

      return jsonResponse({
        message: 'Connexion réussie',
        accessToken,
        user: sanitizeUser(user),
      });
    } catch (err) {
      console.error('[Login Error]', err);
      return createError(err.message || 'Erreur de connexion', 401);
    }
  })

  .post('/refresh', async ({ jwt, cookie }) => {
    const token = cookie?.refresh?.value;
    if (!token) return createError('Token manquant', 401);

    try {
      const decoded = await jwt.verify(token);
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);

      if (!user) return createError('Utilisateur introuvable', 404);

      const accessToken = await jwt.sign({ id: user.id, role: user.role });

      return jsonResponse({ accessToken });
    } catch (err) {
      console.error('[Refresh Error]', err);
      return createError('Refresh token invalide', 401);
    }
  })

  .get('/me', ({ user }) => {
    if (!user) return createError('Non authentifié', 401);
    return jsonResponse(sanitizeUser(user));
  })

  .post('/logout', ({ cookie }) => {
    cookie.refresh = { value: '', path: '/', maxAge: 0 };
    return jsonResponse({ message: 'Déconnexion réussie' });
  });
