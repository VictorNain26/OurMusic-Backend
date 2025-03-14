import { Elysia } from 'elysia';
import { validate } from '@elysiajs/valibot';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { registerUser, loginUser, sanitizeUser } from '../services/authService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { jsonResponse, createError } from '../lib/response.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })

  // ✅ Register
  .post('/register', validate('json', registerSchema), async ({ body }) => {
    try {
      const user = await registerUser(body);
      return jsonResponse({ message: 'Inscription réussie', user: sanitizeUser(user) }, 201);
    } catch (err) {
      return createError(err.message || "Échec de l'inscription", 400);
    }
  })

  // ✅ Login
  .post('/login', validate('json', loginSchema), async ctx => {
    try {
      const user = await loginUser(ctx.body);
      const accessToken = await ctx.jwt.sign({ id: user.id, role: user.role });
      const refreshToken = await ctx.jwt.sign({ id: user.id, role: user.role, exp: '7d' });

      ctx.cookie.refresh = {
        value: refreshToken,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      };

      return jsonResponse({ message: 'Connexion réussie', accessToken, user: sanitizeUser(user) });
    } catch (err) {
      return createError(err.message || 'Erreur de connexion', 401);
    }
  })

  // 🔁 Refresh token
  .post('/refresh', async ctx => {
    const token = ctx.cookie?.refresh?.value;
    if (!token) return createError('Token manquant', 401);

    try {
      const decoded = await ctx.jwt.verify(token);
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);

      if (!user) return createError('Utilisateur introuvable', 404);

      const accessToken = await ctx.jwt.sign({ id: user.id, role: user.role });
      return jsonResponse({ accessToken });
    } catch (err) {
      return createError('Refresh token invalide', 401);
    }
  })

  // ✅ Me
  .get('/me', async ctx => {
    if (!ctx.user) return createError('Non authentifié', 401);
    return jsonResponse(sanitizeUser(ctx.user));
  })

  // 🔚 Logout
  .post('/logout', ctx => {
    ctx.cookie.refresh = {
      value: '',
      path: '/',
      maxAge: 0,
    };
    return jsonResponse({ message: 'Déconnexion réussie' });
  });
