// src/routes/auth.routes.js
import { Elysia } from 'elysia';
import { validate } from '@elysiajs/valibot';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { registerUser, loginUser, sanitizeUser } from '../services/authService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/api/auth' })

  // ✅ Register
  .post('/register', validate('json', registerSchema), async ({ body }) => {
    try {
      const user = await registerUser(body);
      return {
        message: 'Inscription réussie',
        user: sanitizeUser(user),
      };
    } catch (err) {
      console.error('[Register Error]', err);
      return new Response(JSON.stringify({ error: err.message || "Échec de l'inscription" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

      return {
        message: 'Connexion réussie',
        accessToken,
        user: sanitizeUser(user),
      };
    } catch (err) {
      console.error('[Login Error]', err);
      return new Response(JSON.stringify({ error: err.message || 'Erreur de connexion' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })

  // 🔁 Refresh token
  .post('/refresh', async ctx => {
    const token = ctx.cookie?.refresh?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token manquant' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const decoded = await ctx.jwt.verify(token);
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .then(r => r[0]);

      if (!user) throw new Error('Utilisateur introuvable');

      const accessToken = await ctx.jwt.sign({ id: user.id, role: user.role });
      return { accessToken };
    } catch (err) {
      console.error('[Refresh Error]', err);
      return new Response(JSON.stringify({ error: 'Refresh token invalide' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })

  // ✅ Me
  .get('/me', async ctx => {
    if (!ctx.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return sanitizeUser(ctx.user);
  })

  // 🔚 Logout
  .post('/logout', ctx => {
    ctx.cookie.refresh = {
      value: '',
      path: '/',
      maxAge: 0,
    };
    return { message: 'Déconnexion réussie' };
  });
